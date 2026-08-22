package main

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type profileResponse struct {
	UserID            int    `json:"user_id"`
	EmployeeID        string `json:"employee_id"`
	Email             string `json:"email"`
	Role              string `json:"role"`
	FullName          string `json:"full_name"`
	Phone             string `json:"phone"`
	Address           string `json:"address"`
	JobTitle          string `json:"job_title"`
	Department        string `json:"department"`
	ProfilePictureURL string `json:"profile_picture_url"`
	DateJoined        string `json:"date_joined"`
}

func fetchProfile(pool *pgxpool.Pool, r *http.Request, targetUserID int) (*profileResponse, error) {
	p := &profileResponse{}
	var dateJoined *time.Time
	err := pool.QueryRow(r.Context(), `
		SELECT u.id, u.employee_id, u.email, u.role,
		       ep.full_name, ep.phone, ep.address, ep.job_title, ep.department, ep.profile_picture_url, ep.date_joined
		FROM users u
		JOIN employee_profiles ep ON ep.user_id = u.id
		WHERE u.id = $1
	`, targetUserID).Scan(
		&p.UserID, &p.EmployeeID, &p.Email, &p.Role,
		&p.FullName, &p.Phone, &p.Address, &p.JobTitle, &p.Department, &p.ProfilePictureURL, &dateJoined,
	)
	if err != nil {
		return nil, err
	}
	if dateJoined != nil {
		p.DateJoined = dateJoined.Format("2006-01-02")
	}
	return p, nil
}

type employeeListRow struct {
	UserID     int    `json:"user_id"`
	EmployeeID string `json:"employee_id"`
	Email      string `json:"email"`
	Role       string `json:"role"`
	FullName   string `json:"full_name"`
	JobTitle   string `json:"job_title"`
	Department string `json:"department"`
}

func listEmployeesHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return requireAdmin(func(w http.ResponseWriter, r *http.Request) {
		rows, err := pool.Query(r.Context(), `
			SELECT u.id, u.employee_id, u.email, u.role, ep.full_name, ep.job_title, ep.department
			FROM users u
			JOIN employee_profiles ep ON ep.user_id = u.id
			ORDER BY ep.full_name, u.employee_id
		`)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not load employees")
			return
		}
		defer rows.Close()

		out := []employeeListRow{}
		for rows.Next() {
			var e employeeListRow
			if err := rows.Scan(&e.UserID, &e.EmployeeID, &e.Email, &e.Role, &e.FullName, &e.JobTitle, &e.Department); err != nil {
				writeError(w, http.StatusInternalServerError, "could not scan employees")
				return
			}
			out = append(out, e)
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"employees": out})
	})
}

type createEmployeeRequest struct {
	EmployeeID string  `json:"employee_id"`
	Email      string  `json:"email"`
	Password   string  `json:"password"`
	Role       string  `json:"role"`
	FullName   string  `json:"full_name"`
	JobTitle   string  `json:"job_title"`
	Department string  `json:"department"`
	Phone      string  `json:"phone"`
	Basic      float64 `json:"basic"`
	HRA        float64 `json:"hra"`
	Allowances float64 `json:"allowances"`
	Deductions float64 `json:"deductions"`
}

// createEmployeeHandler lets an admin onboard an employee directly, fully
// verified — sidesteps the public-signup email-verification flow, which has
// no SMTP provider wired up yet.
func createEmployeeHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return requireAdmin(func(w http.ResponseWriter, r *http.Request) {
		var req createEmployeeRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.EmployeeID == "" || req.Email == "" || len(req.Password) < 8 {
			writeError(w, http.StatusBadRequest, "employee_id, email, and a password of at least 8 characters are required")
			return
		}
		if req.Role != "admin" {
			req.Role = "employee"
		}

		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not hash password")
			return
		}

		var newUserID int
		err = pool.QueryRow(r.Context(), `
			INSERT INTO users (employee_id, email, password_hash, role, email_verified)
			VALUES ($1, $2, $3, $4, TRUE)
			RETURNING id
		`, req.EmployeeID, req.Email, string(hash), req.Role).Scan(&newUserID)
		if err != nil {
			writeError(w, http.StatusConflict, "employee_id or email already registered")
			return
		}

		if _, err := pool.Exec(r.Context(), `
			INSERT INTO employee_profiles (user_id, full_name, job_title, department, phone, date_joined)
			VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
		`, newUserID, req.FullName, req.JobTitle, req.Department, req.Phone); err != nil {
			writeError(w, http.StatusInternalServerError, "could not create profile")
			return
		}

		if _, err := pool.Exec(r.Context(), `
			INSERT INTO salary_structures (user_id, basic, hra, allowances, deductions, effective_from)
			VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
		`, newUserID, req.Basic, req.HRA, req.Allowances, req.Deductions); err != nil {
			writeError(w, http.StatusInternalServerError, "could not create salary structure")
			return
		}

		p, err := fetchProfile(pool, r, newUserID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not load created profile")
			return
		}
		writeJSON(w, http.StatusCreated, p)
	})
}

func deleteEmployeeHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return requireAdmin(func(w http.ResponseWriter, r *http.Request) {
		id, err := pathID(r)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid id")
			return
		}
		if id == userID(r) {
			writeError(w, http.StatusBadRequest, "cannot delete your own account")
			return
		}
		tag, err := pool.Exec(r.Context(), `DELETE FROM users WHERE id = $1`, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not delete employee")
			return
		}
		if tag.RowsAffected() == 0 {
			writeError(w, http.StatusNotFound, "employee not found")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
	})
}

func getMyProfileHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return requireAuth(func(w http.ResponseWriter, r *http.Request) {
		p, err := fetchProfile(pool, r, userID(r))
		if err == pgx.ErrNoRows {
			writeError(w, http.StatusNotFound, "profile not found")
			return
		} else if err != nil {
			writeError(w, http.StatusInternalServerError, "could not load profile")
			return
		}
		writeJSON(w, http.StatusOK, p)
	})
}

type selfProfileUpdate struct {
	Phone             *string `json:"phone"`
	Address           *string `json:"address"`
	ProfilePictureURL *string `json:"profile_picture_url"`
}

func patchMyProfileHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return requireAuth(func(w http.ResponseWriter, r *http.Request) {
		var req selfProfileUpdate
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		_, err := pool.Exec(r.Context(), `
			UPDATE employee_profiles SET
				phone = COALESCE($1, phone),
				address = COALESCE($2, address),
				profile_picture_url = COALESCE($3, profile_picture_url)
			WHERE user_id = $4
		`, req.Phone, req.Address, req.ProfilePictureURL, userID(r))
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not update profile")
			return
		}
		p, err := fetchProfile(pool, r, userID(r))
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not reload profile")
			return
		}
		writeJSON(w, http.StatusOK, p)
	})
}

func getProfileByIDHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return requireAdmin(func(w http.ResponseWriter, r *http.Request) {
		id, err := pathID(r)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid id")
			return
		}
		p, err := fetchProfile(pool, r, id)
		if err == pgx.ErrNoRows {
			writeError(w, http.StatusNotFound, "profile not found")
			return
		} else if err != nil {
			writeError(w, http.StatusInternalServerError, "could not load profile")
			return
		}
		writeJSON(w, http.StatusOK, p)
	})
}

type adminProfileUpdate struct {
	FullName          *string `json:"full_name"`
	Phone             *string `json:"phone"`
	Address           *string `json:"address"`
	JobTitle          *string `json:"job_title"`
	Department        *string `json:"department"`
	ProfilePictureURL *string `json:"profile_picture_url"`
}

func patchProfileByIDHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return requireAdmin(func(w http.ResponseWriter, r *http.Request) {
		id, err := pathID(r)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid id")
			return
		}
		var req adminProfileUpdate
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		_, err = pool.Exec(r.Context(), `
			UPDATE employee_profiles SET
				full_name = COALESCE($1, full_name),
				phone = COALESCE($2, phone),
				address = COALESCE($3, address),
				job_title = COALESCE($4, job_title),
				department = COALESCE($5, department),
				profile_picture_url = COALESCE($6, profile_picture_url)
			WHERE user_id = $7
		`, req.FullName, req.Phone, req.Address, req.JobTitle, req.Department, req.ProfilePictureURL, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not update profile")
			return
		}
		p, err := fetchProfile(pool, r, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not reload profile")
			return
		}
		writeJSON(w, http.StatusOK, p)
	})
}
