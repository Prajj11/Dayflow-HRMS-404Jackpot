package main

import (
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type attendanceRow struct {
	Date     string  `json:"date"`
	Status   string  `json:"status"`
	CheckIn  *string `json:"check_in"`
	CheckOut *string `json:"check_out"`
}

func checkinHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return requireAuth(func(w http.ResponseWriter, r *http.Request) {
		today := time.Now().Format("2006-01-02")
		_, err := pool.Exec(r.Context(), `
			INSERT INTO attendance (user_id, date, status, check_in)
			VALUES ($1, $2, 'present', now())
			ON CONFLICT (user_id, date) DO UPDATE SET check_in = now(), status = 'present'
		`, userID(r), today)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not record check-in")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "checked in", "date": today})
	})
}

func checkoutHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return requireAuth(func(w http.ResponseWriter, r *http.Request) {
		today := time.Now().Format("2006-01-02")
		tag, err := pool.Exec(r.Context(), `
			UPDATE attendance SET check_out = now()
			WHERE user_id = $1 AND date = $2
		`, userID(r), today)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not record check-out")
			return
		}
		if tag.RowsAffected() == 0 {
			writeError(w, http.StatusBadRequest, "no check-in found for today")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "checked out", "date": today})
	})
}

func fetchAttendance(pool *pgxpool.Pool, r *http.Request, targetUserID int, rangeParam string) ([]attendanceRow, error) {
	days := 1
	if rangeParam == "weekly" {
		days = 7
	}
	since := time.Now().AddDate(0, 0, -days+1).Format("2006-01-02")

	rows, err := pool.Query(r.Context(), `
		SELECT date, status, check_in, check_out
		FROM attendance
		WHERE user_id = $1 AND date >= $2
		ORDER BY date DESC
	`, targetUserID, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []attendanceRow{}
	for rows.Next() {
		var a attendanceRow
		var date time.Time
		var checkIn, checkOut *time.Time
		if err := rows.Scan(&date, &a.Status, &checkIn, &checkOut); err != nil {
			return nil, err
		}
		a.Date = date.Format("2006-01-02")
		if checkIn != nil {
			s := checkIn.Format(time.RFC3339)
			a.CheckIn = &s
		}
		if checkOut != nil {
			s := checkOut.Format(time.RFC3339)
			a.CheckOut = &s
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func getMyAttendanceHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return requireAuth(func(w http.ResponseWriter, r *http.Request) {
		rows, err := fetchAttendance(pool, r, userID(r), r.URL.Query().Get("range"))
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not load attendance")
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"attendance": rows})
	})
}

func getAttendanceByIDHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return requireAdmin(func(w http.ResponseWriter, r *http.Request) {
		id, err := pathID(r)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid id")
			return
		}
		rows, err := fetchAttendance(pool, r, id, r.URL.Query().Get("range"))
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not load attendance")
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"attendance": rows})
	})
}

type allAttendanceRow struct {
	UserID     int    `json:"user_id"`
	EmployeeID string `json:"employee_id"`
	FullName   string `json:"full_name"`
	Date       string `json:"date"`
	Status     string `json:"status"`
}

func getAllAttendanceHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return requireAdmin(func(w http.ResponseWriter, r *http.Request) {
		date := r.URL.Query().Get("date")
		if date == "" {
			date = time.Now().Format("2006-01-02")
		}
		rows, err := pool.Query(r.Context(), `
			SELECT u.id, u.employee_id, ep.full_name, a.date, a.status
			FROM attendance a
			JOIN users u ON u.id = a.user_id
			JOIN employee_profiles ep ON ep.user_id = u.id
			WHERE a.date = $1
			ORDER BY ep.full_name
		`, date)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not load attendance")
			return
		}
		defer rows.Close()

		out := []allAttendanceRow{}
		for rows.Next() {
			var a allAttendanceRow
			var d time.Time
			if err := rows.Scan(&a.UserID, &a.EmployeeID, &a.FullName, &d, &a.Status); err != nil {
				writeError(w, http.StatusInternalServerError, "could not scan attendance")
				return
			}
			a.Date = d.Format("2006-01-02")
			out = append(out, a)
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"attendance": out, "date": date})
	})
}
