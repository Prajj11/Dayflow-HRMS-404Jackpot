package main

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type payrollResponse struct {
	UserID         int     `json:"user_id"`
	Basic          float64 `json:"basic"`
	HRA            float64 `json:"hra"`
	Allowances     float64 `json:"allowances"`
	Deductions     float64 `json:"deductions"`
	NetPay         float64 `json:"net_pay"`
	EffectiveFrom  string  `json:"effective_from"`
}

func fetchPayroll(pool *pgxpool.Pool, r *http.Request, targetUserID int) (*payrollResponse, error) {
	p := &payrollResponse{UserID: targetUserID}
	var effectiveFrom time.Time
	err := pool.QueryRow(r.Context(), `
		SELECT basic, hra, allowances, deductions, effective_from
		FROM salary_structures WHERE user_id = $1
	`, targetUserID).Scan(&p.Basic, &p.HRA, &p.Allowances, &p.Deductions, &effectiveFrom)
	if err != nil {
		return nil, err
	}
	p.EffectiveFrom = effectiveFrom.Format("2006-01-02")
	p.NetPay = p.Basic + p.HRA + p.Allowances - p.Deductions
	return p, nil
}

func getMyPayrollHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return requireAuth(func(w http.ResponseWriter, r *http.Request) {
		p, err := fetchPayroll(pool, r, userID(r))
		if err == pgx.ErrNoRows {
			writeError(w, http.StatusNotFound, "no salary structure on file")
			return
		} else if err != nil {
			writeError(w, http.StatusInternalServerError, "could not load payroll")
			return
		}
		writeJSON(w, http.StatusOK, p)
	})
}

func getPayrollByIDHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return requireAdmin(func(w http.ResponseWriter, r *http.Request) {
		id, err := pathID(r)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid id")
			return
		}
		p, err := fetchPayroll(pool, r, id)
		if err == pgx.ErrNoRows {
			writeError(w, http.StatusNotFound, "no salary structure on file")
			return
		} else if err != nil {
			writeError(w, http.StatusInternalServerError, "could not load payroll")
			return
		}
		writeJSON(w, http.StatusOK, p)
	})
}

type updateSalaryRequest struct {
	Basic      float64 `json:"basic"`
	HRA        float64 `json:"hra"`
	Allowances float64 `json:"allowances"`
	Deductions float64 `json:"deductions"`
}

func patchPayrollByIDHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return requireAdmin(func(w http.ResponseWriter, r *http.Request) {
		id, err := pathID(r)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid id")
			return
		}
		var req updateSalaryRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		_, err = pool.Exec(r.Context(), `
			INSERT INTO salary_structures (user_id, basic, hra, allowances, deductions, effective_from)
			VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
			ON CONFLICT (user_id) DO UPDATE SET
				basic = $2, hra = $3, allowances = $4, deductions = $5, effective_from = CURRENT_DATE
		`, id, req.Basic, req.HRA, req.Allowances, req.Deductions)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not update salary structure")
			return
		}
		p, err := fetchPayroll(pool, r, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not reload payroll")
			return
		}
		writeJSON(w, http.StatusOK, p)
	})
}
