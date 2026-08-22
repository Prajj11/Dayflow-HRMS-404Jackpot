// Package query provides SELECT-only access to the access-control database.
// No name or employee_code columns are selected anywhere in this package.
package query

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const TZ = "Asia/Kolkata"

func Window(rangeParam, start, end string, ref time.Time) (time.Time, time.Time, error) {
	loc, _ := time.LoadLocation(TZ)
	now := ref.In(loc)
	midnight := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)

	switch rangeParam {
	case "daily":
		return midnight, midnight.AddDate(0, 0, 1), nil
	case "weekly":
		return midnight.AddDate(0, 0, -6), midnight.AddDate(0, 0, 1), nil
	case "custom":
		s, err := time.ParseInLocation("2006-01-02", start, loc)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("bad start: %w", err)
		}
		e, err := time.ParseInLocation("2006-01-02", end, loc)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("bad end: %w", err)
		}
		return s, e.AddDate(0, 0, 1), nil
	default:
		return time.Time{}, time.Time{}, fmt.Errorf("unknown range %q", rangeParam)
	}
}

// --- result types — no name/employee_code fields anywhere ---

type DayCount struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

type HourCount struct {
	Hour  int `json:"hour"`
	Count int `json:"count"`
}

type UserEntriesResult struct {
	OrgUserID  int64      `json:"org_user_id"`
	Count      int        `json:"count"`
	FirstEntry string     `json:"first_entry,omitempty"`
	LastEntry  string     `json:"last_entry,omitempty"`
	ByDay      []DayCount `json:"by_day"`
}

type DoorActivityResult struct {
	AccessPointID int64       `json:"access_point_id"`
	Count         int         `json:"count"`
	ByHour        []HourCount `json:"by_hour"`
	LastActivity  string      `json:"last_activity,omitempty"`
}

type OrgSummaryResult struct {
	ActiveUsers  int `json:"active_users"`
	TotalUsers   int `json:"total_users"`
	TotalDoors   int `json:"total_doors"`
	SilentDoors  int `json:"silent_doors"`
	TotalEntries int `json:"total_entries"`
	PeakHour     int `json:"peak_hour"`
}

type HourlyBreakdownResult struct {
	Buckets []HourCount `json:"buckets"`
}

type UserRef struct {
	OrgUserID int64 `json:"org_user_id"`
}

type DoorRef struct {
	AccessPointID int64  `json:"access_point_id"`
	SerialName    string `json:"serial_name"`
}

type RankedUser struct {
	OrgUserID int64 `json:"org_user_id"`
	Count     int   `json:"count"`
}

type RankedDoor struct {
	AccessPointID int64  `json:"access_point_id"`
	SerialName    string `json:"serial_name"`
	Count         int    `json:"count"`
}

// --- query functions ---

func UserEntries(ctx context.Context, pool *pgxpool.Pool, orgUserID int64, start, end time.Time) (*UserEntriesResult, error) {
	res := &UserEntriesResult{OrgUserID: orgUserID}

	var first, last *time.Time
	err := pool.QueryRow(ctx,
		`select count(*), min(event_time), max(event_time)
		 from events
		 where org_user_id = $1 and event_time >= $2 and event_time < $3`,
		orgUserID, start, end,
	).Scan(&res.Count, &first, &last)
	if err != nil {
		return nil, err
	}
	loc, _ := time.LoadLocation(TZ)
	if first != nil {
		res.FirstEntry = first.In(loc).Format(time.RFC3339)
	}
	if last != nil {
		res.LastEntry = last.In(loc).Format(time.RFC3339)
	}

	rows, err := pool.Query(ctx,
		`select (event_time at time zone $1)::date::text, count(*)
		 from events
		 where org_user_id = $2 and event_time >= $3 and event_time < $4
		 group by 1 order by 1`,
		TZ, orgUserID, start, end,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var d DayCount
		if err := rows.Scan(&d.Date, &d.Count); err != nil {
			return nil, err
		}
		res.ByDay = append(res.ByDay, d)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if res.ByDay == nil {
		res.ByDay = []DayCount{}
	}
	return res, nil
}

func DoorActivity(ctx context.Context, pool *pgxpool.Pool, accessPointID int64, start, end time.Time) (*DoorActivityResult, error) {
	res := &DoorActivityResult{AccessPointID: accessPointID}

	var last *time.Time
	err := pool.QueryRow(ctx,
		`select count(*), max(event_time)
		 from events
		 where access_point_id = $1 and event_time >= $2 and event_time < $3`,
		accessPointID, start, end,
	).Scan(&res.Count, &last)
	if err != nil {
		return nil, err
	}
	loc, _ := time.LoadLocation(TZ)
	if last != nil {
		res.LastActivity = last.In(loc).Format(time.RFC3339)
	}

	rows, err := pool.Query(ctx,
		`select extract(hour from event_time at time zone $1)::int, count(*)
		 from events
		 where access_point_id = $2 and event_time >= $3 and event_time < $4
		 group by 1 order by 1`,
		TZ, accessPointID, start, end,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var h HourCount
		if err := rows.Scan(&h.Hour, &h.Count); err != nil {
			return nil, err
		}
		res.ByHour = append(res.ByHour, h)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if res.ByHour == nil {
		res.ByHour = []HourCount{}
	}
	return res, nil
}

func OrgSummary(ctx context.Context, pool *pgxpool.Pool, start, end time.Time) (*OrgSummaryResult, error) {
	res := &OrgSummaryResult{}

	pool.QueryRow(ctx,
		`select count(distinct org_user_id), count(*) from events where event_time >= $1 and event_time < $2`,
		start, end,
	).Scan(&res.ActiveUsers, &res.TotalEntries)

	pool.QueryRow(ctx, `select count(*) from org_users`).Scan(&res.TotalUsers)
	pool.QueryRow(ctx, `select count(*) from access_points`).Scan(&res.TotalDoors)

	pool.QueryRow(ctx,
		`select count(*) from access_points ap
		 where not exists (select 1 from events e where e.access_point_id = ap.access_point_id and e.event_time >= $1 and e.event_time < $2)`,
		start, end,
	).Scan(&res.SilentDoors)

	pool.QueryRow(ctx,
		`select extract(hour from event_time at time zone $1)::int
		 from events where event_time >= $2 and event_time < $3
		 group by 1 order by count(*) desc limit 1`,
		TZ, start, end,
	).Scan(&res.PeakHour)

	return res, nil
}

func HourlyBreakdown(ctx context.Context, pool *pgxpool.Pool, start, end time.Time) (*HourlyBreakdownResult, error) {
	rows, err := pool.Query(ctx,
		`select extract(hour from event_time at time zone $1)::int, count(*)
		 from events where event_time >= $2 and event_time < $3
		 group by 1 order by 1`,
		TZ, start, end,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	res := &HourlyBreakdownResult{}
	for rows.Next() {
		var h HourCount
		if err := rows.Scan(&h.Hour, &h.Count); err != nil {
			return nil, err
		}
		res.Buckets = append(res.Buckets, h)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if res.Buckets == nil {
		res.Buckets = []HourCount{}
	}
	return res, nil
}

func UserList(ctx context.Context, pool *pgxpool.Pool) ([]UserRef, error) {
	rows, err := pool.Query(ctx, `select org_user_id from org_users order by org_user_id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var res []UserRef
	for rows.Next() {
		var u UserRef
		if err := rows.Scan(&u.OrgUserID); err != nil {
			return nil, err
		}
		res = append(res, u)
	}
	return res, rows.Err()
}

func DoorList(ctx context.Context, pool *pgxpool.Pool) ([]DoorRef, error) {
	rows, err := pool.Query(ctx, `select access_point_id, access_point_name from access_points order by access_point_id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var res []DoorRef
	for rows.Next() {
		var d DoorRef
		if err := rows.Scan(&d.AccessPointID, &d.SerialName); err != nil {
			return nil, err
		}
		res = append(res, d)
	}
	return res, rows.Err()
}

func TopUsers(ctx context.Context, pool *pgxpool.Pool, start, end time.Time, limit int) ([]RankedUser, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}
	rows, err := pool.Query(ctx,
		`select org_user_id, count(*) as cnt
		 from events where event_time >= $1 and event_time < $2
		 group by org_user_id order by cnt desc limit $3`,
		start, end, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var res []RankedUser
	for rows.Next() {
		var r RankedUser
		if err := rows.Scan(&r.OrgUserID, &r.Count); err != nil {
			return nil, err
		}
		res = append(res, r)
	}
	return res, rows.Err()
}

func TopDoors(ctx context.Context, pool *pgxpool.Pool, start, end time.Time, limit int) ([]RankedDoor, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}
	rows, err := pool.Query(ctx,
		`select ap.access_point_id, ap.access_point_name, count(e.id) as cnt
		 from access_points ap
		 left join events e on e.access_point_id = ap.access_point_id
		   and e.event_time >= $1 and e.event_time < $2
		 group by ap.access_point_id, ap.access_point_name
		 order by cnt desc limit $3`,
		start, end, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var res []RankedDoor
	for rows.Next() {
		var r RankedDoor
		if err := rows.Scan(&r.AccessPointID, &r.SerialName, &r.Count); err != nil {
			return nil, err
		}
		res = append(res, r)
	}
	return res, rows.Err()
}
