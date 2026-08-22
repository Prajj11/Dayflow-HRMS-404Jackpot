import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Clock, LogIn, LogOut } from "lucide-react";
import { apiFetch } from "../lib/api";

export const Route = createFileRoute("/attendance")({
  component: AttendancePage,
});

type Status = "present" | "absent" | "half_day" | "leave";

interface AttendanceRow {
  date: string;
  status: Status;
  check_in: string | null;
  check_out: string | null;
}

const statusStyles: Record<Status, string> = {
  present: "bg-[oklch(0.93_0.06_150)] text-[oklch(0.35_0.1_150)]",
  absent: "bg-[oklch(0.93_0.06_25)] text-[oklch(0.4_0.15_25)]",
  half_day: "bg-[oklch(0.93_0.08_70)] text-[oklch(0.4_0.12_70)]",
  leave: "bg-[oklch(0.92_0.05_280)] text-[oklch(0.4_0.1_280)]",
};

const statusLabels: Record<Status, string> = {
  present: "Present",
  absent: "Absent",
  half_day: "Half-day",
  leave: "Leave",
};

function AttendancePage() {
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<"daily" | "weekly">("weekly");
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    apiFetch<{ attendance: AttendanceRow[] }>(`/api/attendance/me?range=${range}`)
      .then((d) => { setRows(d.attendance); setLoading(false); })
      .catch((e) => { setError(String(e)); setLoading(false); });
  }

  useEffect(load, [range]);

  async function checkIn() {
    setBusy(true);
    try { await apiFetch("/api/attendance/checkin", { method: "POST" }); load(); }
    finally { setBusy(false); }
  }

  async function checkOut() {
    setBusy(true);
    try { await apiFetch("/api/attendance/checkout", { method: "POST" }); load(); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <a href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </a>

        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
            <p className="mt-1 text-sm text-muted-foreground">Daily and weekly view, check-in / check-out</p>
          </div>
          <div className="flex gap-2">
            <button onClick={checkIn} disabled={busy} className="flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
              <LogIn className="h-4 w-4" /> Check in
            </button>
            <button onClick={checkOut} disabled={busy} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50">
              <LogOut className="h-4 w-4" /> Check out
            </button>
          </div>
        </header>

        <div className="mb-4 inline-flex rounded-lg border border-border bg-card p-1">
          {(["daily", "weekly"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3.5 py-1.5 text-sm font-medium capitalize transition-colors ${
                range === r ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {loading && <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="rounded-xl border border-destructive bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}

        {!loading && !error && (
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            {rows.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">No attendance records yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((r) => (
                  <li key={r.date} className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{r.date}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {r.check_in && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.check_in).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                          {r.check_out && ` – ${new Date(r.check_out).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`}
                        </span>
                      )}
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[r.status]}`}>
                        {statusLabels[r.status]}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
