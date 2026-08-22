import { createFileRoute } from "@tanstack/react-router";
import {
  BadgeCheck,
  Bell,
  CalendarCheck,
  Clock,
  IndianRupee,
  LogOut,
  UserCircle,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: EmployeeDashboard,
});

type AttendanceStatus = "present" | "absent" | "half-day" | "leave";

const statusStyles: Record<AttendanceStatus, string> = {
  present: "bg-[oklch(0.93_0.06_150)] text-[oklch(0.35_0.1_150)]",
  absent: "bg-[oklch(0.93_0.06_25)] text-[oklch(0.4_0.15_25)]",
  "half-day": "bg-[oklch(0.93_0.08_70)] text-[oklch(0.4_0.12_70)]",
  leave: "bg-[oklch(0.92_0.05_280)] text-[oklch(0.4_0.1_280)]",
};

const statusLabels: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  "half-day": "Half-day",
  leave: "Leave",
};

interface WeekDay {
  day: string;
  status: AttendanceStatus;
}

// Placeholder attendance until the backend exposes /api/attendance.
const week: WeekDay[] = [
  { day: "Mon", status: "present" },
  { day: "Tue", status: "present" },
  { day: "Wed", status: "half-day" },
  { day: "Thu", status: "present" },
  { day: "Fri", status: "leave" },
];

interface QuickAccessCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}

const quickAccess: QuickAccessCard[] = [
  {
    icon: <UserCircle className="h-5 w-5" />,
    title: "Profile",
    description: "Personal, job details, salary structure, documents",
    href: "/profile",
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: "Attendance",
    description: "Daily and weekly view, check-in / check-out",
    href: "/attendance",
  },
  {
    icon: <CalendarCheck className="h-5 w-5" />,
    title: "Leave Requests",
    description: "Apply for leave, track approval status",
    href: "/leave",
  },
  {
    icon: <IndianRupee className="h-5 w-5" />,
    title: "Payroll",
    description: "View salary slips and payment history",
    href: "/payroll",
  },
];

interface Alert {
  icon: React.ReactNode;
  text: string;
  time: string;
}

const alerts: Alert[] = [
  {
    icon: <BadgeCheck className="h-4 w-4 text-primary" />,
    text: "Your leave request for Aug 25–26 was approved",
    time: "2h ago",
  },
  {
    icon: <IndianRupee className="h-4 w-4 text-primary" />,
    text: "August payslip is now available",
    time: "1d ago",
  },
  {
    icon: <Bell className="h-4 w-4 text-primary" />,
    text: "Reminder: submit your weekly timesheet",
    time: "2d ago",
  },
];

function EmployeeDashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Dayflow
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Good to see you
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every workday, perfectly aligned.
            </p>
          </div>
          <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
            <LogOut className="h-4 w-4 text-muted-foreground" />
            Logout
          </button>
        </header>

        {/* Quick access */}
        <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {quickAccess.map((card) => (
            <a
              key={card.title}
              href={card.href}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/50 hover:bg-accent/40"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                {card.icon}
              </div>
              <h2 className="mt-3 text-sm font-semibold tracking-tight">
                {card.title}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {card.description}
              </p>
            </a>
          ))}
        </section>

        <div className="grid gap-6 md:grid-cols-3">
          {/* This week's attendance */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-2">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold tracking-tight">
                This week's attendance
              </h2>
              <a href="/attendance" className="text-xs font-medium text-primary hover:underline">
                View all
              </a>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {week.map((d) => (
                <div
                  key={d.day}
                  className="flex flex-col items-center gap-2 rounded-xl border border-border bg-background px-2 py-4"
                >
                  <span className="text-xs font-medium text-muted-foreground">
                    {d.day}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[d.status]}`}
                  >
                    {statusLabels[d.status]}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Recent activity */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold tracking-tight">
              Recent activity
            </h2>
            <ul className="space-y-4">
              {alerts.map((a, i) => (
                <li key={i} className="flex gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    {a.icon}
                  </div>
                  <div>
                    <p className="text-sm leading-snug text-foreground">{a.text}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{a.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
