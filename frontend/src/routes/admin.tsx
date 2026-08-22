import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Users } from "lucide-react";
import { apiFetch, getRole } from "../lib/api";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

interface Employee {
  user_id: number;
  employee_id: string;
  email: string;
  role: string;
  full_name: string;
  job_title: string;
  department: string;
}

interface AdminProfile {
  full_name: string;
  phone: string;
  address: string;
  job_title: string;
  department: string;
}

interface Payroll {
  basic: number;
  hra: number;
  allowances: number;
  deductions: number;
  net_pay: number;
}

interface AttendanceToday {
  user_id: number;
  employee_id: string;
  full_name: string;
  date: string;
  status: string;
}

function AdminPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [today, setToday] = useState<AttendanceToday[]>([]);
  const [selected, setSelected] = useState<Employee | null>(null);

  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [payrollSaving, setPayrollSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    const role = getRole();
    if (role !== "admin") {
      navigate({ to: "/" });
      return;
    }
    setReady(true);
    apiFetch<{ employees: Employee[] }>("/api/employees").then((d) => setEmployees(d.employees));
    apiFetch<{ attendance: AttendanceToday[] }>("/api/attendance/all").then((d) => setToday(d.attendance));
  }, [navigate]);

  function selectEmployee(e: Employee) {
    setSelected(e);
    setSavedMsg(null);
    apiFetch<AdminProfile>(`/api/profile/${e.user_id}`).then(setProfile);
    apiFetch<Payroll>(`/api/payroll/${e.user_id}`)
      .then(setPayroll)
      .catch(() => setPayroll({ basic: 0, hra: 0, allowances: 0, deductions: 0, net_pay: 0 }));
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !profile) return;
    setProfileSaving(true);
    try {
      await apiFetch(`/api/profile/${selected.user_id}`, {
        method: "PATCH",
        body: JSON.stringify(profile),
      });
      setSavedMsg("Profile saved.");
      const list = await apiFetch<{ employees: Employee[] }>("/api/employees");
      setEmployees(list.employees);
    } finally {
      setProfileSaving(false);
    }
  }

  async function savePayroll(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !payroll) return;
    setPayrollSaving(true);
    try {
      const updated = await apiFetch<Payroll>(`/api/payroll/${selected.user_id}`, {
        method: "PATCH",
        body: JSON.stringify(payroll),
      });
      setPayroll(updated);
      setSavedMsg("Salary structure saved.");
    } finally {
      setPayrollSaving(false);
    }
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <a href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </a>

        <header className="mb-6 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Admin panel</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Manage employees, attendance, and payroll</p>
          </div>
        </header>

        <section className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold tracking-tight">Today's attendance</h2>
          {today.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance recorded today.</p>
          ) : (
            <ul className="divide-y divide-border">
              {today.map((a) => (
                <li key={a.user_id} className="flex items-center justify-between py-2 text-sm">
                  <span>{a.full_name || a.employee_id}</span>
                  <span className="text-xs font-medium capitalize text-muted-foreground">{a.status.replace("_", " ")}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card shadow-sm">
            <h2 className="border-b border-border px-6 py-4 text-sm font-semibold tracking-tight">Employees</h2>
            <ul className="divide-y divide-border">
              {employees.map((e) => (
                <li key={e.user_id}>
                  <button
                    onClick={() => selectEmployee(e)}
                    className={`flex w-full items-center justify-between px-6 py-3 text-left text-sm transition-colors hover:bg-accent/40 ${
                      selected?.user_id === e.user_id ? "bg-accent/40" : ""
                    }`}
                  >
                    <div>
                      <p className="font-medium">{e.full_name || e.employee_id}</p>
                      <p className="text-xs text-muted-foreground">{e.employee_id} · {e.job_title || "—"}</p>
                    </div>
                    <span className="text-[11px] font-semibold uppercase text-muted-foreground">{e.role}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <div className="space-y-6">
            {!selected ? (
              <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground shadow-sm">
                Select an employee to view and edit their details.
              </div>
            ) : (
              <>
                {profile && (
                  <form onSubmit={saveProfile} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold tracking-tight">Profile — {selected.employee_id}</h3>
                    <div className="space-y-3">
                      <input placeholder="Full name" value={profile.full_name}
                        onChange={(ev) => setProfile({ ...profile, full_name: ev.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                      <input placeholder="Job title" value={profile.job_title}
                        onChange={(ev) => setProfile({ ...profile, job_title: ev.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                      <input placeholder="Department" value={profile.department}
                        onChange={(ev) => setProfile({ ...profile, department: ev.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                      <input placeholder="Phone" value={profile.phone}
                        onChange={(ev) => setProfile({ ...profile, phone: ev.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    </div>
                    <button type="submit" disabled={profileSaving} className="mt-3 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50">
                      {profileSaving ? "Saving…" : "Save profile"}
                    </button>
                  </form>
                )}

                {payroll && (
                  <form onSubmit={savePayroll} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold tracking-tight">Salary structure</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {(["basic", "hra", "allowances", "deductions"] as const).map((field) => (
                        <div key={field}>
                          <label className="mb-1 block text-[11px] capitalize text-muted-foreground">{field}</label>
                          <input type="number" value={payroll[field]}
                            onChange={(ev) => setPayroll({ ...payroll, [field]: Number(ev.target.value) })}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                        </div>
                      ))}
                    </div>
                    <button type="submit" disabled={payrollSaving} className="mt-3 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50">
                      {payrollSaving ? "Saving…" : "Save salary structure"}
                    </button>
                  </form>
                )}

                {savedMsg && <p className="text-xs text-muted-foreground">{savedMsg}</p>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
