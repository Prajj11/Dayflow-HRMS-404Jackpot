package main

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Summary struct {
	Date            string   `json:"date"`
	Range           string   `json:"range"`
	ActiveUsers     int      `json:"active_users"`
	TotalUsers      int      `json:"total_users"`
	PeakHour        int      `json:"peak_hour"`
	PeakLabel       string   `json:"peak_label"`
	TotalDoors      int      `json:"total_doors"`
	SilentDoors     int      `json:"silent_doors"`
	SilentDoorNames []string `json:"silent_door_names"`
	TotalEntries    int      `json:"total_entries"`
}

type HourBucket struct {
	Hour    int `json:"hour"`
	Entries int `json:"entries"`
}

type DoorRow struct {
	DoorName     string  `json:"door_name"`
	Entries      int     `json:"entries"`
	LastActivity *string `json:"last_activity"`
}

type SummaryResponse struct {
	Summary Summary      `json:"summary"`
	Hourly  []HourBucket `json:"hourly"`
	Doors   []DoorRow    `json:"doors"`
}

func buildSummary(ctx context.Context, pool *pgxpool.Pool, rangeParam string, ref time.Time) (*SummaryResponse, error) {
	start, end, dateStr := timeWindow(rangeParam, ref)

	// active users + total entries
	var activeUsers, totalEntries int
	if err := pool.QueryRow(ctx,
		`select count(distinct user_id), count(*)
		 from gatepoint_events
		 where event_type = 'authorised_access'
		   and accessed_at >= $1 and accessed_at < $2`,
		start, end,
	).Scan(&activeUsers, &totalEntries); err != nil {
		return nil, err
	}

	// total unique users and doors in entire dataset
	var totalUsers, totalDoors int
	if err := pool.QueryRow(ctx, `select count(distinct user_id) from gatepoint_events where event_type = 'authorised_access'`).Scan(&totalUsers); err != nil {
		return nil, err
	}
	if err := pool.QueryRow(ctx, `select count(distinct access_point_id) from gatepoint_events where event_type = 'authorised_access'`).Scan(&totalDoors); err != nil {
		return nil, err
	}

	// hourly buckets
	hrows, err := pool.Query(ctx,
		`select extract(hour from accessed_at at time zone $1)::int, count(*)
		 from gatepoint_events
		 where event_type = 'authorised_access'
		   and accessed_at >= $2 and accessed_at < $3
		 group by 1 order by 1`,
		timezone, start, end,
	)
	if err != nil {
		return nil, err
	}
	defer hrows.Close()

	var hourly []HourBucket
	peakHour, peakEntries := 0, 0
	for hrows.Next() {
		var b HourBucket
		if err := hrows.Scan(&b.Hour, &b.Entries); err != nil {
			return nil, err
		}
		if b.Entries > peakEntries {
			peakEntries = b.Entries
			peakHour = b.Hour
		}
		hourly = append(hourly, b)
	}
	if err := hrows.Err(); err != nil {
		return nil, err
	}
	if hourly == nil {
		hourly = []HourBucket{}
	}

	// doors active in window
	// some events carry no access point at all; they are labelled here so the
	// entries stay visible rather than arriving as a NULL that breaks the scan
	drows, err := pool.Query(ctx,
		`select coalesce(nullif(trim(access_point_name), ''), $3) as door_name,
		        count(*) as entries, max(accessed_at) as last_act
		 from gatepoint_events
		 where event_type = 'authorised_access'
		   and accessed_at >= $1 and accessed_at < $2
		 group by door_name
		 order by entries desc`,
		start, end, unknownDoor,
	)
	if err != nil {
		return nil, err
	}
	defer drows.Close()

	var doors []DoorRow
	for drows.Next() {
		var d DoorRow
		var lastAct *time.Time
		if err := drows.Scan(&d.DoorName, &d.Entries, &lastAct); err != nil {
			return nil, err
		}
		if lastAct != nil {
			loc, _ := time.LoadLocation(timezone)
			s := lastAct.In(loc).Format(time.RFC3339)
			d.LastActivity = &s
		}
		doors = append(doors, d)
	}
	if err := drows.Err(); err != nil {
		return nil, err
	}
	if doors == nil {
		doors = []DoorRow{}
	}

	// totalDoors counts identified doors, so the unattributed bucket must not
	// count as one of them or the silent-door figure drifts
	activeDoors := 0
	for _, d := range doors {
		if d.DoorName != unknownDoor {
			activeDoors++
		}
	}
	silentDoors := totalDoors - activeDoors
	if silentDoors < 0 {
		silentDoors = 0
	}

	return &SummaryResponse{
		Summary: Summary{
			Date:            dateStr,
			Range:           rangeParam,
			ActiveUsers:     activeUsers,
			TotalUsers:      totalUsers,
			PeakHour:        peakHour,
			PeakLabel:       peakLabel(peakHour),
			TotalDoors:      totalDoors,
			SilentDoors:     silentDoors,
			SilentDoorNames: []string{},
			TotalEntries:    totalEntries,
		},
		Hourly: hourly,
		Doors:  doors,
	}, nil
}

func timeWindow(rangeParam string, ref time.Time) (start, end time.Time, dateStr string) {
	loc, _ := time.LoadLocation(timezone)
	now := ref.In(loc)
	midnight := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)
	endOfDay := midnight.AddDate(0, 0, 1)

	if rangeParam == "weekly" {
		start = midnight.AddDate(0, 0, -6)
		end = endOfDay
		dateStr = fmt.Sprintf("%s – %s", start.Format("2006-01-02"), midnight.Format("2006-01-02"))
	} else {
		start = midnight
		end = endOfDay
		dateStr = midnight.Format("2006-01-02")
	}
	return
}

func toInt(v any) int {
	switch x := v.(type) {
	case float64:
		return int(x)
	case int:
		return x
	case int64:
		return int(x)
	}
	return 0
}

// latestEvent returns the time of the most recent authorised access, or now if
// the table is empty or unreadable.
func latestEvent(ctx context.Context, pool *pgxpool.Pool) time.Time {
	var t time.Time
	err := pool.QueryRow(ctx,
		`select max(accessed_at) from gatepoint_events where event_type = 'authorised_access'`).Scan(&t)
	if err != nil || t.IsZero() {
		return time.Now()
	}
	return t
}
