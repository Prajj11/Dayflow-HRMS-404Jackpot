# Dayflow HRMS - Human Resource Management System

> Every workday, perfectly aligned.

Dayflow HRMS is a modern, high-performance Human Resource Management System designed to digitize and streamline core HR operations for enterprises.

## Core Modules

- **Auth** — authentication, JWT and role-based authorization
- **Employee** — employee profiles and management
- **Attendance** — check-in/check-out and attendance records
- **Leave** — leave requests and approval workflows
- **Payroll** — salary structure and payroll visibility
- **Policy Engine** — evaluates configurable HR rules
- **Anomaly Engine** — identifies suspicious or unusual attendance/activity
- **Audit Logging** — records important system actions

---

## Features & Highlights

- 🔑 **Role-Based Access Control**: Instant toggle between **Employee View** and **HR Admin View**.
- ⏱️ **Live Attendance Tracker**: Real-time check-in/check-out ticker widget with total hours logged.
- 🏢 **HR Command Center**: Company-wide directory, pending leave request approval queue with comments, and KPI metrics.
- 👤 **Employee Profile Management**: Multi-tab profile (Personal, Job, Salary Structure, Documents) with self-edit vs HR full-edit rights.
- 📅 **Leave & Time-Off Management**: Application form, status tracking (Pending/Approved/Rejected), and automatic balance updates.
- 💰 **Digital Interactive Payslips**: Itemized salary breakdown (Earnings vs Deductions) with Print and PDF export support.
- 📈 **HR Analytics & Reports**: Visual Recharts graphs for attendance trends, leave category distribution, and departmental payroll budgets.

---

## Tech Stack & Architecture

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide React Icons, Recharts
- **Framework & Router**: TanStack Router / TanStack Start
- **Build Tool**: Vite

---

## Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) in your browser.

### 3. Production Build
```bash
npm run build
```
