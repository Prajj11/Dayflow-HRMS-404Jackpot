package main

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type leaveRow struct {
	ID           int    `json:"id"`
	UserID       int    `json:"user_id"`
	EmployeeID   string `json:"employee_id,omitempty"`
	FullName     string `json:"full_name,omitempty"`
	LeaveType    string `json:"leave_type"`
	StartDate    string `json:"start_date"`
	EndDate      string `json:"end_date"`
	Remarks      string `json:"remarks"`
	Status       string `json:"status"`
	AdminComment string `json:"admin_comment"`
}

type applyLeaveRequest struct {
	LeaveType string `json:"leave_type"`
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
	Remarks   string `json:"remarks"`
}

func applyLeaveHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return requireAuth(func(w http.ResponseWriter, r *http.Request) {
		var req applyLeaveRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.LeaveType != "paid" && req.LeaveType != "sick" && req.LeaveType != "unpaid" {
			writeError(w, http.StatusBadRequest, "leave_type must be paid, sick, or unpaid")
			return
		}
		if req.StartDate == "" || req.EndDate == "" {
			writeError(w, http.StatusBadRequest, "start_date and end_date are required")
			return
		}

		var id int
		err := pool.QueryRow(r.Context(), `
			INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, remarks)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id
		`, userID(r), req.LeaveType, req.StartDate, req.EndDate, req.Remarks).Scan(&id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not submit leave request")
			return
		}
		writeJSON(w, http.StatusCreated, map[string]interface{}{"id": id, "status": "pending"})
	})
}

func scanLeaveRows(rows interface {
	Next() bool
	Scan(...interface{}) error
	Err() error
}) ([]leaveRow, error) {
	out := []leaveRow{}
	for rows.Next() {
		var l leaveRow
		var start, end time.Time
		if err := rows.Scan(&l.ID, &l.UserID, &l.LeaveType, &start, &end, &l.Remarks, &l.Status, &l.AdminComment); err != nil {
			return nil, err
		}
		l.StartDate = start.Format("2006-01-02")
		l.EndDate = end.Format("2006-01-02")
		out = append(out, l)
	}
	return out, rows.Err()
}

func getMyLeaveHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return requireAuth(func(w http.ResponseWriter, r *http.Request) {
		rows, err := pool.Query(r.Context(), `
			SELECT id, user_id, leave_type, start_date, end_date, remarks, status, admin_comment
			FROM leave_requests WHERE user_id = $1 ORDER BY created_at DESC
		`, userID(r))
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not load leave requests")
			return
		}
		defer rows.Close()
		out, err := scanLeaveRows(rows)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not scan leave requests")
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"leave_requests": out})
	})
}

func getAllLeaveHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return requireAdmin(func(w http.ResponseWriter, r *http.Request) {
		rows, err := pool.Query(r.Context(), `
			SELECT lr.id, lr.user_id, u.employee_id, ep.full_name, lr.leave_type,
			       lr.start_date, lr.end_date, lr.remarks, lr.status, lr.admin_comment
			FROM leave_requests lr
			JOIN users u ON u.id = lr.user_id
			JOIN employee_profiles ep ON ep.user_id = u.id
			ORDER BY lr.created_at DESC
		`)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not load leave requests")
			return
		}
		defer rows.Close()

		out := []leaveRow{}
		for rows.Next() {
			var l leaveRow
			var start, end time.Time
			if err := rows.Scan(&l.ID, &l.UserID, &l.EmployeeID, &l.FullName, &l.LeaveType,
				&start, &end, &l.Remarks, &l.Status, &l.AdminComment); err != nil {
				writeError(w, http.StatusInternalServerError, "could not scan leave requests")
				return
			}
			l.StartDate = start.Format("2006-01-02")
			l.EndDate = end.Format("2006-01-02")
			out = append(out, l)
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"leave_requests": out})
	})
}

type reviewLeaveRequest struct {
	Status       string `json:"status"`
	AdminComment string `json:"admin_comment"`
}

func reviewLeaveHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return requireAdmin(func(w http.ResponseWriter, r *http.Request) {
		id, err := pathID(r)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid id")
			return
		}
		var req reviewLeaveRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.Status != "approved" && req.Status != "rejected" {
			writeError(w, http.StatusBadRequest, "status must be approved or rejected")
			return
		}

		tag, err := pool.Exec(r.Context(), `
			UPDATE leave_requests
			SET status = $1, admin_comment = $2, reviewed_by = $3
			WHERE id = $4
		`, req.Status, req.AdminComment, userID(r), id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not update leave request")
			return
		}
		if tag.RowsAffected() == 0 {
			writeError(w, http.StatusNotFound, "leave request not found")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": req.Status})
	})
}
