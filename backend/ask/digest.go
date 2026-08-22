package ask

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// IDCount pairs an opaque entity id with a count. Deliberately carries no name —
// this is what crosses the inference boundary.
type IDCount struct {
	ID    int64 `json:"id"`
	Count int   `json:"count"`
}

type LabelCount struct {
	Label string `json:"label"`
	Count int    `json:"count"`
}

type HourBucket struct {
	Hour  int `json:"hour"`
	Count int `json:"count"`
}

// FactBundle is the complete set of facts backing a digest. Every field is
// numeric or a non-personal label, so the whole struct is safe to send to a model.
type FactBundle struct {
	Start string `json:"start"`
	End   string `json:"end"`
	Days  int    `json:"days"`

	TotalEntries int `json:"total_entries"`
	ActiveUsers  int `json:"active_users"`
	TotalUsers   int `json:"total_users"`
	ActiveDoors  int `json:"active_doors"`
	TotalDoors   int `json:"total_doors"`
	SilentDoors  int `json:"silent_doors"`

	FirstEntry string `json:"first_entry"`
	LastEntry  string `json:"last_entry"`

	PeakHour     int `json:"peak_hour"`
	PeakCount    int `json:"peak_count"`
	PeakSharePct int `json:"peak_share_pct"`

	Hourly []HourBucket `json:"hourly"`

	TopUsers      []IDCount `json:"top_users"`
	TopDoors      []IDCount `json:"top_doors"`
	Top3SharePct  int       `json:"top3_users_share_pct"`
	MedianEntries int       `json:"median_entries_per_user"`
	MaxEntries    int       `json:"max_entries_per_user"`

	AccessMix  []LabelCount `json:"access_mix"`
	Directions []LabelCount `json:"directions"`

	PrevEntries     int `json:"prev_entries"`
	PrevActiveUsers int `json:"prev_active_users"`
	EntriesDeltaPct int `json:"entries_delta_pct"`
}

const digestTZ = "Asia/Kolkata"

// BuildFactBundle gathers every statistic the digest needs. start/end are
// inclusive YYYY-MM-DD dates in IST.
func BuildFactBundle(ctx context.Context, pool *pgxpool.Pool, start, end string) (*FactBundle, error) {
	b := &FactBundle{Start: start, End: end}

	const base = `event_type='authorised_access'
		and (accessed_at at time zone $1)::date >= $2::date
		and (accessed_at at time zone $1)::date <= $3::date`

	err := pool.QueryRow(ctx, `
		select
			($3::date - $2::date) + 1,
			count(*),
			count(distinct user_id),
			count(distinct access_point_id),
			coalesce(to_char(min((accessed_at at time zone $1)::time), 'HH24:MI'), ''),
			coalesce(to_char(max((accessed_at at time zone $1)::time), 'HH24:MI'), '')
		from gatepoint_events where `+base,
		digestTZ, start, end).
		Scan(&b.Days, &b.TotalEntries, &b.ActiveUsers, &b.ActiveDoors, &b.FirstEntry, &b.LastEntry)
	if err != nil {
		return nil, fmt.Errorf("headline: %w", err)
	}

	// org-wide totals (all time), not window-scoped
	if err := pool.QueryRow(ctx, `
		select count(distinct user_id), count(distinct access_point_id)
		from gatepoint_events where event_type='authorised_access'`).
		Scan(&b.TotalUsers, &b.TotalDoors); err != nil {
		return nil, fmt.Errorf("totals: %w", err)
	}
	b.SilentDoors = b.TotalDoors - b.ActiveDoors

	if b.TotalEntries == 0 {
		return b, nil
	}

	rows, err := pool.Query(ctx, `
		select extract(hour from accessed_at at time zone $1)::int as h, count(*)
		from gatepoint_events where `+base+`
		group by h order by h`, digestTZ, start, end)
	if err != nil {
		return nil, fmt.Errorf("hourly: %w", err)
	}
	for rows.Next() {
		var hb HourBucket
		if err := rows.Scan(&hb.Hour, &hb.Count); err != nil {
			rows.Close()
			return nil, err
		}
		b.Hourly = append(b.Hourly, hb)
		if hb.Count > b.PeakCount {
			b.PeakCount, b.PeakHour = hb.Count, hb.Hour
		}
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("hourly rows: %w", err)
	}
	b.PeakSharePct = pct(b.PeakCount, b.TotalEntries)

	if b.TopUsers, err = idCounts(ctx, pool, `user_id`, base, start, end, 5); err != nil {
		return nil, fmt.Errorf("top users: %w", err)
	}
	if b.TopDoors, err = idCounts(ctx, pool, `access_point_id`, base, start, end, 5); err != nil {
		return nil, fmt.Errorf("top doors: %w", err)
	}

	top3 := 0
	for i, u := range b.TopUsers {
		if i >= 3 {
			break
		}
		top3 += u.Count
	}
	b.Top3SharePct = pct(top3, b.TotalEntries)
	if len(b.TopUsers) > 0 {
		b.MaxEntries = b.TopUsers[0].Count
	}

	if err := pool.QueryRow(ctx, `
		select coalesce(percentile_disc(0.5) within group (order by c), 0)::int from (
			select count(*) as c from gatepoint_events where `+base+` group by user_id
		) t`, digestTZ, start, end).Scan(&b.MedianEntries); err != nil {
		return nil, fmt.Errorf("median: %w", err)
	}

	if b.AccessMix, err = labelCounts(ctx, pool,
		`coalesce(nullif(mobile_access_mode,''), nullif(access_type,''), 'unknown')`, base, start, end); err != nil {
		return nil, fmt.Errorf("access mix: %w", err)
	}
	if b.Directions, err = labelCounts(ctx, pool,
		`coalesce(nullif(direction,''), 'unspecified')`, base, start, end); err != nil {
		return nil, fmt.Errorf("directions: %w", err)
	}

	// preceding window of equal length, for trend
	if err := pool.QueryRow(ctx, `
		select count(*), count(distinct user_id)
		from gatepoint_events
		where event_type='authorised_access'
		  and (accessed_at at time zone $1)::date >= ($2::date - $3::int)
		  and (accessed_at at time zone $1)::date <  $2::date`,
		digestTZ, start, b.Days).Scan(&b.PrevEntries, &b.PrevActiveUsers); err != nil {
		return nil, fmt.Errorf("prev window: %w", err)
	}
	if b.PrevEntries > 0 {
		b.EntriesDeltaPct = pct(b.TotalEntries-b.PrevEntries, b.PrevEntries)
	}

	return b, nil
}

func idCounts(ctx context.Context, pool *pgxpool.Pool, col, base, start, end string, limit int) ([]IDCount, error) {
	rows, err := pool.Query(ctx, `
		select `+col+`, count(*) as c
		from gatepoint_events where `+base+` and `+col+` is not null
		group by 1 order by c desc limit `+fmt.Sprint(limit), digestTZ, start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []IDCount
	for rows.Next() {
		var ic IDCount
		if err := rows.Scan(&ic.ID, &ic.Count); err != nil {
			return nil, err
		}
		out = append(out, ic)
	}
	return out, rows.Err()
}

func labelCounts(ctx context.Context, pool *pgxpool.Pool, expr, base, start, end string) ([]LabelCount, error) {
	rows, err := pool.Query(ctx, `
		select `+expr+` as label, count(*) as c
		from gatepoint_events where `+base+`
		group by 1 order by c desc`, digestTZ, start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []LabelCount
	for rows.Next() {
		var lc LabelCount
		if err := rows.Scan(&lc.Label, &lc.Count); err != nil {
			return nil, err
		}
		out = append(out, lc)
	}
	return out, rows.Err()
}

func pct(part, whole int) int {
	if whole == 0 {
		return 0
	}
	return int(float64(part) / float64(whole) * 100)
}
