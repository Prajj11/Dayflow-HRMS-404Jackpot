package ask

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Profiling the view beats writing prose rules about it: the model gets the real
// value domains and null rates, and it stays correct as the data changes.
var (
	profileText string
	profileAt   time.Time
	profileMu   sync.RWMutex
)

type columnProfile struct {
	Name     string
	Type     string
	NullPct  int
	Distinct int
	Sample   []string
}

// categorical columns worth enumerating; wide/unique columns are skipped
var profiledColumns = []string{"event_type", "direction", "access_type", "mobile_access_mode", "access_point_deleted"}

// SchemaProfile returns a description of gatepoint_events_anon built from the data,
// cached for an hour. On any failure it returns the static column list alone.
func SchemaProfile(ctx context.Context, pool *pgxpool.Pool) string {
	profileMu.RLock()
	if profileText != "" && time.Since(profileAt) < time.Hour {
		defer profileMu.RUnlock()
		return profileText
	}
	profileMu.RUnlock()

	text, err := buildProfile(ctx, pool)
	if err != nil {
		return columnList
	}

	profileMu.Lock()
	profileText, profileAt = text, time.Now()
	profileMu.Unlock()
	return text
}

const columnList = `Table: gatepoint_events_anon — one row per access-control event, i.e. one badge
at one door by one person. Counting rows counts events; "entries", "accesses",
"badge-ins" and "swipes" all mean rows.

  id                   bigint       event id
  user_id              bigint       opaque person id
  access_point_id      bigint       opaque door id
  site_id              bigint       building
  event_type           text         outcome of the attempt (whether access was granted)
  accessed_at          timestamptz  raw UTC instant
  day                  date         calendar date, IST
  hour                 int          hour of day 0-23, IST
  day_of_week          int          0=Sunday .. 6=Saturday, IST
  direction            text         which way the person physically passed through the door.
                                     Only relevant when a question contrasts arriving with
                                     leaving; it is not what makes an event an "entry".
  access_type          text         the method used to open the door
  mobile_access_mode   text         sub-mode, only set when access_type is mobile
  access_point_deleted boolean      the door was removed later; the event still happened

There are no name columns anywhere in this table. People and doors are ids only.`

func buildProfile(ctx context.Context, pool *pgxpool.Pool) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	var sb strings.Builder
	sb.WriteString(columnList)

	var total int
	var minDay, maxDay time.Time
	if err := pool.QueryRow(ctx,
		`select count(*), min(day), max(day) from `+anonView).Scan(&total, &minDay, &maxDay); err != nil {
		return "", err
	}
	fmt.Fprintf(&sb, "\n\nRows: %d, covering %s to %s (IST).\n",
		total, minDay.Format("2006-01-02"), maxDay.Format("2006-01-02"))

	sb.WriteString("\nObserved values (measured from the data, not assumptions):\n")
	for _, col := range profiledColumns {
		p, err := profileColumn(ctx, pool, col, total)
		if err != nil {
			continue
		}
		fmt.Fprintf(&sb, "  %s — %d distinct, %d%% null", p.Name, p.Distinct, p.NullPct)
		if len(p.Sample) > 0 {
			fmt.Fprintf(&sb, ", values: %s", strings.Join(p.Sample, ", "))
		}
		sb.WriteString("\n")
	}
	return sb.String(), nil
}

func profileColumn(ctx context.Context, pool *pgxpool.Pool, col string, total int) (*columnProfile, error) {
	p := &columnProfile{Name: col}
	var nulls int
	if err := pool.QueryRow(ctx, fmt.Sprintf(
		`select count(distinct %s), count(*) filter (where %s is null) from %s`,
		col, col, anonView)).Scan(&p.Distinct, &nulls); err != nil {
		return nil, err
	}
	p.NullPct = pct(nulls, total)

	// enumerate only when the domain is small enough to be useful verbatim
	if p.Distinct > 0 && p.Distinct <= 25 {
		rows, err := pool.Query(ctx, fmt.Sprintf(
			`select %s::text, count(*) as c from %s where %s is not null
			 group by 1 order by c desc limit 25`, col, anonView, col))
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		for rows.Next() {
			var v string
			var c int
			if err := rows.Scan(&v, &c); err != nil {
				return nil, err
			}
			p.Sample = append(p.Sample, fmt.Sprintf("'%s' (%d%%)", v, pct(c, total)))
		}
	}
	return p, nil
}
