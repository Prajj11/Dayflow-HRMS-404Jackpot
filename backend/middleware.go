package main

import (
	"context"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const (
	ctxUserID contextKey = "user_id"
	ctxRole   contextKey = "role"
)

type claims struct {
	UserID int    `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func jwtSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "dev-only-insecure-secret-change-me"
	}
	return []byte(secret)
}

func issueToken(userID int, role string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims{
		UserID: userID,
		Role:   role,
	})
	return token.SignedString(jwtSecret())
}

func parseToken(tokenStr string) (*claims, error) {
	c := &claims{}
	_, err := jwt.ParseWithClaims(tokenStr, c, func(t *jwt.Token) (interface{}, error) {
		return jwtSecret(), nil
	})
	if err != nil {
		return nil, err
	}
	return c, nil
}

func requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if !strings.HasPrefix(auth, "Bearer ") {
			http.Error(w, `{"error":"missing bearer token"}`, http.StatusUnauthorized)
			return
		}
		c, err := parseToken(strings.TrimPrefix(auth, "Bearer "))
		if err != nil {
			http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), ctxUserID, c.UserID)
		ctx = context.WithValue(ctx, ctxRole, c.Role)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

func requireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return requireAuth(func(w http.ResponseWriter, r *http.Request) {
		if userRole(r) != "admin" {
			http.Error(w, `{"error":"admin access required"}`, http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func userID(r *http.Request) int {
	v, _ := r.Context().Value(ctxUserID).(int)
	return v
}

func userRole(r *http.Request) string {
	v, _ := r.Context().Value(ctxRole).(string)
	return v
}

// pathID extracts a trailing numeric path segment, e.g. /api/profile/42 -> 42.
func pathID(r *http.Request) (int, error) {
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	return strconv.Atoi(parts[len(parts)-1])
}
