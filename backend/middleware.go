package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const (
	ctxUserID      contextKey = "user_id"
	ctxRole        contextKey = "role"
	authCookieName            = "dayflow_access"
	jwtIssuer                 = "dayflow-api"
	jwtAudience               = "dayflow-web"
	accessTokenTTL            = 30 * time.Minute
)

type claims struct {
	UserID int    `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func jwtSecret() ([]byte, error) {
	secret := os.Getenv("JWT_SECRET")
	if len(secret) < 32 {
		return nil, fmt.Errorf("JWT_SECRET must contain at least 32 characters")
	}
	return []byte(secret), nil
}

func issueToken(userID int, role string) (string, error) {
	secret, err := jwtSecret()
	if err != nil {
		return "", err
	}
	now := time.Now().UTC()
	tokenID, err := generateToken()
	if err != nil {
		return "", err
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    jwtIssuer,
			Subject:   strconv.Itoa(userID),
			Audience:  jwt.ClaimStrings{jwtAudience},
			ExpiresAt: jwt.NewNumericDate(now.Add(accessTokenTTL)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now.Add(-5 * time.Second)),
			ID:        tokenID,
		},
	})
	return token.SignedString(secret)
}

func parseToken(tokenStr string) (*claims, error) {
	secret, err := jwtSecret()
	if err != nil {
		return nil, err
	}
	c := &claims{}
	token, err := jwt.ParseWithClaims(tokenStr, c, func(_ *jwt.Token) (interface{}, error) {
		return secret, nil
	},
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(jwtIssuer),
		jwt.WithAudience(jwtAudience),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return nil, err
	}
	if !token.Valid || c.UserID <= 0 || c.Subject != strconv.Itoa(c.UserID) {
		return nil, fmt.Errorf("invalid token claims")
	}
	return c, nil
}

// cookieSecurityAttrs returns (Secure, SameSite) for the auth cookie. The
// frontend (Vercel) and backend (Railway) are on different sites, so the
// cookie must be SameSite=None to be sent on cross-site fetch() calls at
// all — SameSite=Lax only rides along on same-site requests and top-level
// navigations, not XHR/fetch, so every authenticated call after signin
// would silently lose the cookie and look like a 401. SameSite=None
// requires Secure, so local HTTP dev (COOKIE_SECURE=false) stays on Lax,
// where frontend and backend are same-site (localhost) anyway.
func cookieSecurityAttrs() (bool, http.SameSite) {
	secure, _ := strconv.ParseBool(os.Getenv("COOKIE_SECURE"))
	if secure {
		return true, http.SameSiteNoneMode
	}
	return false, http.SameSiteLaxMode
}

func setAuthCookie(w http.ResponseWriter, token string) {
	secure, sameSite := cookieSecurityAttrs()
	http.SetCookie(w, &http.Cookie{
		Name:     authCookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   int(accessTokenTTL.Seconds()),
		HttpOnly: true,
		Secure:   secure,
		SameSite: sameSite,
	})
}

func clearAuthCookie(w http.ResponseWriter) {
	secure, sameSite := cookieSecurityAttrs()
	http.SetCookie(w, &http.Cookie{
		Name:     authCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   secure,
		SameSite: sameSite,
	})
}

func requestToken(r *http.Request) string {
	if cookie, err := r.Cookie(authCookieName); err == nil {
		return cookie.Value
	}
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(auth, "Bearer "))
	}
	return ""
}

// internalServiceToken authenticates trusted server-to-server callers (the MCP
// server) as an admin, since they have no browser session or JWT of their own.
// Only active when MCP_INTERNAL_TOKEN is set; empty/unset means the path is disabled.
func internalServiceToken(r *http.Request) bool {
	expected := os.Getenv("MCP_INTERNAL_TOKEN")
	return expected != "" && r.Header.Get("X-Internal-Token") == expected
}

func requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if internalServiceToken(r) {
			ctx := context.WithValue(r.Context(), ctxUserID, 0)
			ctx = context.WithValue(ctx, ctxRole, "admin")
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}
		token := requestToken(r)
		if token == "" {
			writeError(w, http.StatusUnauthorized, "authentication required")
			return
		}
		c, err := parseToken(token)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "invalid or expired session")
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
