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

## Step-by-step walkthrough

Everything below works on the live app — no setup needed. Takes about 3 minutes.

**Part 1 — HR Admin side**

1. Go to **https://dayflow-hrms-five.vercel.app**
2. Sign in with `hr.demo@dayflow.io` / `Demo@1234`
3. You land on the **HR Admin & Operations Hub** — the four cards at the top (Total Workforce, Today's Attendance, Leave Approvals, Est. Monthly Payroll) are all real numbers pulled from the database, not placeholders.
4. Scroll down to see the **Attendance, Past 7 Days** and **Leave Distribution** charts — also real, sourced from the seeded employees.
5. Click the **Employee Directory** tab to see all 20+ employees, with edit/delete actions on each row.
6. Click the **Leave Approvals** tab, filter to **Pending** — approve or reject a real request and watch the "Leave Approvals" count on the dashboard update immediately.
7. Click the **Payroll Control** tab, click **Adjust** on any employee, change a number, save — the net pay recalculates live, and you can click **Payslip** to preview/download a real PDF.
8. Click **Onboard Employee** (top right) to add a new employee with a real name/email/salary — this sends a real invitation email with a temporary password (only completes if email delivery is configured; safe to try, safe to skip).

**Part 2 — Employee side**

9. Click the **Logout** icon (top right), then sign in with `employee.demo@dayflow.io` / `Demo@1234`.
10. You land on the employee's own dashboard — click **Clock In**, wait a few seconds, then **Clock Out**. Check the **Attendance** tab: your real check-in/check-out time is there.
11. Click **Apply for leave** in the **Leave** tab, fill in a type/date range/reason, submit — it appears instantly as "Pending."
12. Click the profile icon (top right) to see your account details and edit contact info — changes persist on refresh.
13. Click the **Payroll** tab to see the salary breakdown as an employee would (read-only).

That's the full loop: an admin managing the org, and an employee using the self-service portal, both against the same live database with no mock data anywhere.

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
