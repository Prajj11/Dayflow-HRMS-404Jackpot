package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func generateToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

type signupRequest struct {
	EmployeeID string `json:"employee_id"`
	Email      string `json:"email"`
	Password   string `json:"password"`
	Role       string `json:"role"`
}

func signupHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req signupRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.EmployeeID == "" || req.Email == "" || len(req.Password) < 8 {
			writeError(w, http.StatusBadRequest, "employee_id, email, and a password of at least 8 characters are required")
			return
		}
		if req.Role != "employee" && req.Role != "admin" {
			req.Role = "employee"
		}

		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not hash password")
			return
		}
		verifyToken, err := generateToken()
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not generate verification token")
			return
		}
		expiresAt := time.Now().Add(24 * time.Hour)

		var userID int
		err = pool.QueryRow(r.Context(), `
			INSERT INTO users (employee_id, email, password_hash, role, verification_token, verification_expires_at)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING id
		`, req.EmployeeID, req.Email, string(hash), req.Role, verifyToken, expiresAt).Scan(&userID)
		if err != nil {
			writeError(w, http.StatusConflict, "employee_id or email already registered")
			return
		}

		if _, err := pool.Exec(r.Context(),
			`INSERT INTO employee_profiles (user_id) VALUES ($1)`, userID,
		); err != nil {
			log.Printf("signup: create profile row: %v", err)
		}

		// No SMTP provider configured yet — log the verification link instead
		// of sending it. The token/endpoint are real; only delivery is stubbed.
		log.Printf("verification link for %s: /auth/verify?token=%s", req.Email, verifyToken)

		writeJSON(w, http.StatusCreated, map[string]interface{}{
			"id":          userID,
			"employee_id": req.EmployeeID,
			"email":       req.Email,
			"role":        req.Role,
		})
	}
}

func verifyHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := r.URL.Query().Get("token")
		if token == "" {
			writeError(w, http.StatusBadRequest, "missing token")
			return
		}
		tag, err := pool.Exec(r.Context(), `
			UPDATE users
			SET email_verified = TRUE, verification_token = NULL
			WHERE verification_token = $1 AND verification_expires_at > now()
		`, token)
		if err != nil || tag.RowsAffected() == 0 {
			writeError(w, http.StatusBadRequest, "invalid or expired token")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "verified"})
	}
}

type signinRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func signinHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req signinRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		var userID int
		var passwordHash, role string
		err := pool.QueryRow(r.Context(),
			`SELECT id, password_hash, role FROM users WHERE email = $1`, req.Email,
		).Scan(&userID, &passwordHash, &role)
		if err == pgx.ErrNoRows {
			writeError(w, http.StatusUnauthorized, "invalid email or password")
			return
		} else if err != nil {
			writeError(w, http.StatusInternalServerError, "sign in failed")
			return
		}

		if bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)) != nil {
			writeError(w, http.StatusUnauthorized, "invalid email or password")
			return
		}

		token, err := issueToken(userID, role)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not issue token")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"token": token, "role": role})
	}
}
