# Dayflow — Human Resource Management System

Dayflow is a full-stack HRMS built for the 404 Jackpot hackathon team: a Go backend, a React/TypeScript frontend, and PostgreSQL — covering authentication, employee profiles, attendance, leave, payroll, and admin approval workflows end to end, with no mock data anywhere in the request path.

**Live app:** https://dayflow-hrms-five.vercel.app
**API:** https://backend-production-29383.up.railway.app

## Demo credentials

Seeded automatically on first boot (see `backend/migrations/0004_seed_demo_data.sql`) — use these to explore the app without signing up:

| Role | Email | Password |
|---|---|---|
| HR Admin | `hr.demo@dayflow.io` | `Demo@1234` |
| Employee | `employee.demo@dayflow.io` | `Demo@1234` |

The seed also adds five more employees across Engineering, Marketing, Sales, Product, and Operations with realistic attendance history and a mix of pending/approved/rejected leave requests, so the admin dashboard's charts and tables are populated out of the box instead of showing empty states.

## Quickstart (local, Docker)

```
docker compose up --build
```

This builds and starts everything: Postgres, Redis, the Go backend (`localhost:8090`), the MCP server (`localhost:8091`), and the frontend (`localhost:3090`). Migrations — schema and seed data — run automatically on backend startup; no manual DB setup required. Sign in at `localhost:3090/login` with the demo credentials above.

Optional environment variables (all have safe local defaults — only needed to change behavior):

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | Session signing key (defaults to a dev-only value) |
| `EMAIL_PROVIDER` | `smtp` (default, local dev) or `resend` (hosted deployments) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USERNAME` / `SMTP_PASSWORD` / `SMTP_FROM` | Used when `EMAIL_PROVIDER=smtp` |
| `RESEND_API_KEY` / `EMAIL_FROM` | Used when `EMAIL_PROVIDER=resend` |
| `GROQ_API_KEY` / `GROQ_API_KEY_FALLBACK` | Powers the natural-language `/ask` query endpoint |

## Technology stack

- **Backend:** Go, `net/http` stdlib mux, `pgx/v5`, `redis/go-redis/v9`
- **Auth:** JWT + Redis-backed server-side sessions (real revocation, not just token expiry), bcrypt password hashing
- **Frontend:** React + TypeScript, TanStack Router, Tailwind
- **Database:** PostgreSQL, plain versioned SQL migrations (no ORM)
- **Deployment:** Railway (backend + MCP server), Vercel (frontend), Docker Compose (local dev)

## Email delivery

Hosted deployments (Railway) use the Resend HTTPS API — `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM=Dayflow <onboarding@mail.grindlog.lol>` — since Railway blocks outbound SMTP ports. SMTP with STARTTLS remains available for local development via `EMAIL_PROVIDER=smtp` and the `SMTP_*` variables above. Provider credentials are backend-only secrets, never exposed to the frontend.

## Core modules

- **Auth** — sign up, email verification, sign in, session management, first-login OTP password setup
- **Employee** — profile view/edit, admin-managed onboarding with emailed temporary passwords
- **Attendance** — check-in/check-out, daily/weekly views, admin-wide visibility
- **Leave** — apply, track status, admin approve/reject with comments
- **Payroll** — employee read-only view, admin salary structure control, payslip preview/PDF
- **Ask** — natural-language querying over HR data via Groq
