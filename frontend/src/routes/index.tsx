import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Bell,
  CalendarDays,
  Clock,
  CreditCard,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Play,
  Plus,
  Save,
  ShieldCheck,
  Square,
  TrendingUp,
  User as UserIcon,
  XCircle,
} from "lucide-react";
import { apiFetch, ApiError, clearSession } from "../lib/api";

export const Route = createFileRoute("/")({
  component: EmployeeWorkspace,
});

type AttendanceStatus = "present" | "absent" | "half_day" | "leave";
type LeaveType = "paid" | "sick" | "unpaid";
type LeaveStatus = "pending" | "approved" | "rejected";
type Tab = "overview" | "attendance" | "leave" | "payroll";

interface Profile {
  user_id: number;
  employee_id: string;
  email: string;
  role: string;
  full_name: string;
  phone: string;
  address: string;
  job_title: string;
  department: string;
  date_joined: string;
}

interface AttendanceRow {
  date: string;
  status: AttendanceStatus;
  check_in: string | null;
  check_out: string | null;
}

interface LeaveRow {
  id: number;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  remarks: string;
  status: LeaveStatus;
  admin_comment: string;
}

interface Payroll {
  basic: number;
  hra: number;
  allowances: number;
  deductions: number;
  net_pay: number;
  effective_from: string;
}

const statusStyles: Record<AttendanceStatus, string> = {
  present: "bg-[oklch(0.93_0.06_150)] text-[oklch(0.35_0.1_150)]",
  absent: "bg-[oklch(0.93_0.06_25)] text-[oklch(0.4_0.15_25)]",
  half_day: "bg-[oklch(0.93_0.08_70)] text-[oklch(0.4_0.12_70)]",
  leave: "bg-[oklch(0.92_0.05_280)] text-[oklch(0.4_0.1_280)]",
};

const statusLabels: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  half_day: "Half-day",
  leave: "Leave",
};

const leaveStatusStyles: Record<LeaveStatus, string> = {
  pending: "bg-[oklch(0.93_0.08_70)] text-[oklch(0.4_0.12_70)] border-[oklch(0.85_0.08_70)]",
  approved: "bg-[oklch(0.93_0.06_150)] text-[oklch(0.35_0.1_150)] border-[oklch(0.85_0.08_150)]",
  rejected: "bg-[oklch(0.93_0.06_25)] text-[oklch(0.4_0.15_25)] border-[oklch(0.85_0.08_25)]",
};

function currency(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function weekday(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" });
}

function formatClock(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatElapsed(ms: number) {
  const totalSecs = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function EmployeeWorkspace() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [week, setWeek] = useState<AttendanceRow[]>([]);
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [payroll, setPayroll] = useState<Payroll | null>(null);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  const [now, setNow] = useState(Date.now());

  async function loadAll() {
    try {
      const [me, p, a, l] = await Promise.all([
        apiFetch<{ role: string }>("/auth/me"),
        apiFetch<Profile>("/api/profile/me"),
        apiFetch<{ attendance: AttendanceRow[] }>("/api/attendance/me?range=weekly"),
        apiFetch<{ leave_requests: LeaveRow[] }>("/api/leave/me"),
      ]);
      setIsAdmin(me.role === "admin");
      setProfile(p);
      setPhoneInput(p.phone);
      setAddressInput(p.address);
      setWeek(a.attendance);
      setLeaves(l.leave_requests);
      try {
        setPayroll(await apiFetch<Payroll>("/api/payroll/me"));
      } catch {
        setPayroll(null);
      }
      setLoading(false);
      setAuthChecked(true);
    } catch {
      navigate({ to: "/login" });
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const todayRow = week.find((d) => d.date === today) ?? null;
  const isCheckedIn = !!todayRow?.check_in && !todayRow?.check_out;

  useEffect(() => {
    if (!isCheckedIn) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isCheckedIn]);

  const shiftElapsedMs = useMemo(() => {
    if (!todayRow?.check_in) return 0;
    const start = new Date(todayRow.check_in).getTime();
    const end = todayRow.check_out ? new Date(todayRow.check_out).getTime() : now;
    return end - start;
  }, [todayRow, now]);

  const pendingLeaves = leaves.filter((l) => l.status === "pending");
  const presentDays = week.filter((d) => d.status === "present").length;
  const punctuality = week.length > 0 ? Math.round((presentDays / week.length) * 1000) / 10 : null;

  async function toggleCheckInOut() {
    try {
      if (isCheckedIn) {
        await apiFetch("/api/attendance/checkout", { method: "POST" });
      } else {
        await apiFetch("/api/attendance/checkin", { method: "POST" });
      }
      const a = await apiFetch<{ attendance: AttendanceRow[] }>("/api/attendance/me?range=weekly");
      setWeek(a.attendance);
    } catch {
      // surfaced implicitly by unchanged UI state; keep it simple, no toast infra in this app
    }
  }

  async function saveContact(e: React.FormEvent) {
    e.preventDefault();
    setSavingContact(true);
    setContactError(null);
    try {
      const p = await apiFetch<Profile>("/api/profile/me", {
        method: "PATCH",
        body: JSON.stringify({ phone: phoneInput, address: addressInput }),
      });
      setProfile(p);
      setEditingContact(false);
    } catch (e) {
      setContactError(e instanceof ApiError ? e.message : "Could not update contact info.");
    } finally {
      setSavingContact(false);
    }
  }

  async function logout() {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } finally {
      clearSession();
      navigate({ to: "/login" });
    }
  }

  const initials = (profile?.full_name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!authChecked) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top navbar */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-foreground">Dayflow</span>
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-accent-foreground border border-primary/20">
                  HRMS
                </span>
              </div>
              <p className="font-display text-lg leading-none text-primary">Every workday, aligned.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <a
                href="/admin"
                className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3.5 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
              >
                <ShieldCheck className="h-4 w-4" />
                HR Admin Hub
              </a>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications((v) => !v)}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-accent transition-colors"
              >
                <Bell className="h-4 w-4" />
                {pendingLeaves.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-warning font-data text-[10px] font-bold text-warning-foreground">
                    {pendingLeaves.length}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl border border-border bg-card p-3 shadow-xl z-50">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground px-1 pb-2 border-b border-border">
                    Notifications
                  </h4>
                  {pendingLeaves.length === 0 ? (
                    <p className="px-1 py-3 text-sm text-muted-foreground">No pending items.</p>
                  ) : (
                    <div className="mt-2 space-y-1.5">
                      {pendingLeaves.map((l) => (
                        <div key={l.id} className="rounded-lg bg-muted/50 px-2.5 py-2">
                          <p className="text-xs font-semibold text-foreground capitalize">{l.leave_type} leave pending</p>
                          <p className="text-xs text-muted-foreground">{l.start_date} – {l.end_date}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProfileMenu((v) => !v)}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-1.5 hover:bg-accent transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent font-data text-xs font-bold text-accent-foreground border border-primary/20">
                  {initials}
                </div>
                <div className="text-left leading-tight hidden sm:block">
                  <p className="text-xs font-bold text-foreground">{profile?.full_name ?? "…"}</p>
                  <p className="text-[11px] text-muted-foreground">{profile?.job_title}</p>
                </div>
              </button>

              {showProfileMenu && profile && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-card p-4 shadow-xl z-50">
                  <div className="border-b border-border pb-3">
                    <p className="text-sm font-bold text-foreground">{profile.full_name}</p>
                    <p className="text-xs text-primary font-semibold">{profile.job_title} • {profile.department}</p>
                    <p className="text-[11px] font-data text-muted-foreground mt-0.5">
                      ID: {profile.employee_id} · Joined {profile.date_joined || "—"}
                    </p>
                  </div>

                  {!editingContact ? (
                    <div className="mt-3 space-y-2">
                      <div className="rounded-lg bg-muted/50 px-3 py-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground block">Email</span>
                        <p className="text-xs font-semibold text-foreground mt-0.5 flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-primary" /> {profile.email}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/50 px-3 py-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground block">Phone</span>
                        <p className="text-xs font-semibold text-foreground mt-0.5 flex items-center gap-1.5 font-data">
                          <Phone className="h-3.5 w-3.5 text-primary" /> {profile.phone || "Not set"}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/50 px-3 py-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground block">Address</span>
                        <p className="text-xs font-semibold text-foreground mt-0.5 flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-primary" /> {profile.address || "Not set"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingContact(true)}
                        className="w-full mt-1 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        Edit contact info
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={saveContact} className="mt-3 space-y-2.5">
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground block">Phone</label>
                        <input
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-data"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground block">Address</label>
                        <input
                          value={addressInput}
                          onChange={(e) => setAddressInput(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
                        />
                      </div>
                      {contactError && <p className="text-xs text-destructive">{contactError}</p>}
                      <div className="flex gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={savingContact}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
                        >
                          <Save className="h-3.5 w-3.5" /> {savingContact ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditingContact(false); setPhoneInput(profile.phone); setAddressInput(profile.address); }}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={logout}
              title="Logout"
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.06em] text-primary">
              <UserIcon className="h-3.5 w-3.5" />
              Employee self-service workspace
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              {loading ? "Loading…" : `Welcome, ${profile?.full_name?.split(" ")[0] ?? ""}`}
            </h1>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
            <div className="text-right">
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground block">Shift timer</span>
              <span className="text-base font-bold font-data text-foreground">{formatElapsed(shiftElapsedMs)}</span>
            </div>
            <button
              onClick={toggleCheckInOut}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-white shadow-sm transition-colors ${
                isCheckedIn ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"
              }`}
            >
              {isCheckedIn ? (
                <>
                  <Square className="h-3.5 w-3.5 fill-white" /> Clock out
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-white" /> Clock in
                </>
              )}
            </button>
          </div>
        </div>

        {/* KPI row */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-[0.06em]">Today's shift</span>
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 text-2xl font-bold font-data text-foreground">{formatElapsed(shiftElapsedMs)}</div>
            <p className="mt-2 text-xs font-semibold text-foreground/70">{isCheckedIn ? "Currently clocked in" : todayRow ? "Shift complete" : "Not checked in yet"}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-[0.06em]">Attendance (7d)</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 text-2xl font-bold font-data text-foreground">{punctuality !== null ? `${punctuality}%` : "—"}</div>
            <p className="mt-2 text-xs text-muted-foreground">{presentDays} of {week.length || 0} days present</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-[0.06em]">Leave requests</span>
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 text-2xl font-bold font-data text-foreground">{pendingLeaves.length}</div>
            <p className="mt-2 text-xs text-muted-foreground">pending review</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-[0.06em]">Net monthly pay</span>
              <IndianRupee className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 text-2xl font-bold font-data text-foreground">{payroll ? currency(payroll.net_pay) : "—"}</div>
            <p className="mt-2 text-xs text-muted-foreground">{payroll ? `Effective ${payroll.effective_from}` : "No structure on file"}</p>
          </div>
        </section>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="flex gap-6 overflow-x-auto">
            {([
              ["overview", "Overview", LayoutDashboard],
              ["attendance", "Attendance", Clock],
              ["leave", `Leave (${pendingLeaves.length})`, CalendarDays],
              ["payroll", "Payroll", CreditCard],
            ] as [Tab, string, typeof Clock][]).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold uppercase tracking-[0.06em] whitespace-nowrap transition-colors ${
                  tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </nav>
        </div>

        {tab === "overview" && (
          <div className="grid gap-6 md:grid-cols-3">
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-2">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">This week's attendance</h2>
                <button onClick={() => setTab("attendance")} className="text-xs font-medium text-primary hover:underline">View all</button>
              </div>
              {loading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
              ) : week.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No attendance yet — clock in above.</p>
              ) : (
                <div className="grid grid-cols-5 gap-2">
                  {week.slice(0, 5).reverse().map((d) => (
                    <div key={d.date} className="flex flex-col items-center gap-2 rounded-xl border border-border bg-background px-2 py-4">
                      <span className="text-xs font-medium text-muted-foreground">{weekday(d.date)}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[d.status]}`}>{statusLabels[d.status]}</span>
                      <span className="text-[10px] font-data text-muted-foreground">{formatClock(d.check_in)}–{formatClock(d.check_out)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground">Leave status</h3>
                <button onClick={() => setTab("leave")} className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/70">
                  <Plus className="h-3 w-3" /> Apply
                </button>
              </div>
              {leaves.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No leave requests yet.</p>
              ) : (
                <div className="mt-3 space-y-2.5">
                  {leaves.slice(0, 4).map((l) => (
                    <div key={l.id} className="rounded-lg bg-muted/50 px-3 py-2.5 border border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground capitalize">{l.leave_type} leave</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${leaveStatusStyles[l.status]}`}>{l.status}</span>
                      </div>
                      <p className="text-[11px] font-data text-muted-foreground mt-1">{l.start_date} – {l.end_date}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === "attendance" && <AttendancePanel week={week} />}
        {tab === "leave" && <LeavePanel leaves={leaves} onRefresh={loadAll} />}
        {tab === "payroll" && <PayrollPanel payroll={payroll} />}
      </main>
    </div>
  );
}

function AttendancePanel({ week }: { week: AttendanceRow[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold tracking-tight text-foreground">Attendance — last 7 days</h2>
      {week.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No records yet.</p>
      ) : (
        <div className="space-y-2">
          {week.map((d) => (
            <div key={d.date} className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{d.date} · {weekday(d.date)}</p>
                <p className="text-xs font-data text-muted-foreground">In {formatClock(d.check_in)} · Out {formatClock(d.check_out)}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[d.status]}`}>{statusLabels[d.status]}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LeavePanel({ leaves, onRefresh }: { leaves: LeaveRow[]; onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>("paid");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/leave", {
        method: "POST",
        body: JSON.stringify({ leave_type: leaveType, start_date: startDate, end_date: endDate, remarks }),
      });
      setOpen(false);
      setStartDate("");
      setEndDate("");
      setRemarks("");
      onRefresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not submit leave request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Leave requests</h2>
        <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
          <Plus className="h-3.5 w-3.5" /> {open ? "Cancel" : "Apply for leave"}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="mb-6 grid gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-2">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground block">Type</label>
            <select value={leaveType} onChange={(e) => setLeaveType(e.target.value as LeaveType)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="paid">Paid</option>
              <option value="sick">Sick</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
          <div />
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground block">Start date</label>
            <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground block">End date</label>
            <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground block">Remarks</label>
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          {error && <p className="sm:col-span-2 text-xs text-destructive">{error}</p>}
          <div className="sm:col-span-2">
            <button type="submit" disabled={submitting} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
              {submitting ? "Submitting…" : "Submit request"}
            </button>
          </div>
        </form>
      )}

      {leaves.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No leave requests yet.</p>
      ) : (
        <div className="space-y-3">
          {leaves.map((l) => (
            <div key={l.id} className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground capitalize">{l.leave_type} leave</span>
                <span className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${leaveStatusStyles[l.status]}`}>
                  {l.status === "approved" ? <BadgeCheck className="h-3 w-3" /> : l.status === "rejected" ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  {l.status}
                </span>
              </div>
              <p className="mt-1 text-xs font-data text-muted-foreground">{l.start_date} – {l.end_date}</p>
              {l.remarks && <p className="mt-2 text-sm text-foreground/80">{l.remarks}</p>}
              {l.admin_comment && <p className="mt-1 text-xs text-muted-foreground italic">HR: {l.admin_comment}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PayrollPanel({ payroll }: { payroll: Payroll | null }) {
  if (!payroll) {
    return (
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="py-8 text-center text-sm text-muted-foreground">No salary structure on file yet — check with HR.</p>
      </section>
    );
  }
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm overflow-x-auto">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Salary breakdown</h2>
        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">Effective {payroll.effective_from}</span>
      </div>
      <table className="w-full text-left text-sm">
        <tbody className="divide-y divide-border">
          <tr>
            <td className="py-2.5 text-muted-foreground">Basic</td>
            <td className="py-2.5 text-right font-data">{currency(payroll.basic)}</td>
          </tr>
          <tr>
            <td className="py-2.5 text-muted-foreground">HRA</td>
            <td className="py-2.5 text-right font-data">{currency(payroll.hra)}</td>
          </tr>
          <tr>
            <td className="py-2.5 text-muted-foreground">Allowances</td>
            <td className="py-2.5 text-right font-data text-[oklch(0.4_0.12_150)]">+{currency(payroll.allowances)}</td>
          </tr>
          <tr>
            <td className="py-2.5 text-muted-foreground">Deductions</td>
            <td className="py-2.5 text-right font-data text-destructive">-{currency(payroll.deductions)}</td>
          </tr>
          <tr>
            <td className="py-3 font-bold text-foreground">Net pay</td>
            <td className="py-3 text-right font-data font-bold text-primary">{currency(payroll.net_pay)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
