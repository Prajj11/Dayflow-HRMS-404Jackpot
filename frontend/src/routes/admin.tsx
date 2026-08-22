import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart2,
  CalendarCheck,
  Clock,
  IndianRupee,
  Plus,
  ShieldAlert,
  Users,
} from "lucide-react";

import { apiFetch, clearSession } from "../lib/api";
import { HeaderNav } from "../components/admin/HeaderNav";
import { StatCards } from "../components/admin/StatCards";
import { EmployeeTable } from "../components/admin/EmployeeTable";
import { AddEditEmployeeModal, EmployeeData } from "../components/admin/AddEditEmployeeModal";
import { AttendanceManagement, AttendanceRecord, statusToApi } from "../components/admin/AttendanceManagement";
import { LeaveApprovalHub, LeaveRequest } from "../components/admin/LeaveApprovalHub";
import { PayrollManagement } from "../components/admin/PayrollManagement";
import { AnalyticsDashboard, AttendanceTrendPoint, LeaveTypeSlice } from "../components/admin/AnalyticsDashboard";

export const Route = createFileRoute("/admin")({
  component: AdminDashboardPage,
});

interface ApiEmployee {
  user_id: number;
  employee_id: string;
  email: string;
  role: string;
  full_name: string;
  job_title: string;
  department: string;
}

interface ApiPayroll {
  basic: number;
  hra: number;
  allowances: number;
  deductions: number;
}

interface ApiAttendanceRow {
  user_id: number;
  employee_id: string;
  full_name: string;
  date: string;
  status: "present" | "absent" | "half_day" | "leave";
  check_in: string | null;
  check_out: string | null;
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

interface ApiLeaveRow {
  id: number;
  user_id: number;
  employee_id: string;
  full_name: string;
  leave_type: "paid" | "sick" | "unpaid";
  start_date: string;
  end_date: string;
  remarks: string;
  status: "pending" | "approved" | "rejected";
  admin_comment: string;
}

const apiStatusToLabel: Record<string, AttendanceRecord["status"]> = {
  present: "Present",
  absent: "Absent",
  half_day: "Half-day",
  leave: "On Leave",
};

const leaveTypeLabel: Record<string, string> = {
  paid: "Paid Leave",
  sick: "Sick Leave",
  unpaid: "Unpaid Leave",
};

function daysBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

function AdminDashboardPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [adminTab, setAdminTab] = useState<"overview" | "employees" | "attendance" | "leaves" | "payroll">("overview");
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [todaysAttendance, setTodaysAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<AttendanceTrendPoint[]>([]);
  const [leaveTypeData, setLeaveTypeData] = useState<LeaveTypeSlice[]>([
    { name: "Paid Leave", value: 0, color: "#8b5cf6" },
    { name: "Sick Leave", value: 0, color: "#f59e0b" },
    { name: "Unpaid Leave", value: 0, color: "#ef4444" },
  ]);
  const [myEmployeeId, setMyEmployeeId] = useState("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeData | null>(null);

  async function loadEmployees(attendanceByUser: Map<number, AttendanceRecord>) {
    const empRes = await apiFetch<{ employees: ApiEmployee[] }>("/api/employees");
    const withPayroll = await Promise.all(
      empRes.employees.map(async (e) => {
        let payroll: ApiPayroll = { basic: 0, hra: 0, allowances: 0, deductions: 0 };
        try {
          payroll = await apiFetch<ApiPayroll>(`/api/payroll/${e.user_id}`);
        } catch {
          // no salary structure set yet — defaults to zero
        }
        const today = attendanceByUser.get(e.user_id);
        const data: EmployeeData = {
          id: e.employee_id,
          userId: e.user_id,
          name: e.full_name || e.employee_id,
          email: e.email,
          role: e.role === "admin" ? "Admin" : "Employee",
          department: e.department || "Unassigned",
          designation: e.job_title || "—",
          status: today?.status === "On Leave" ? "On Leave" : "Active",
          joinDate: "",
          phone: "",
          baseSalary: payroll.basic,
          hra: payroll.hra,
          bonus: payroll.allowances,
          deductions: payroll.deductions,
        };
        return data;
      })
    );
    setEmployees(withPayroll);
  }

  async function loadLeave() {
    const res = await apiFetch<{ leave_requests: ApiLeaveRow[] }>("/api/leave/all");
    const mapped: LeaveRequest[] = res.leave_requests.map((r) => ({
      id: String(r.id),
      employeeId: r.employee_id,
      employeeName: r.full_name || r.employee_id,
      department: "",
      leaveType: leaveTypeLabel[r.leave_type] as LeaveRequest["leaveType"],
      startDate: r.start_date,
      endDate: r.end_date,
      totalDays: daysBetween(r.start_date, r.end_date),
      reason: r.remarks || "—",
      status: r.status === "approved" ? "Approved" : r.status === "rejected" ? "Rejected" : "Pending",
      appliedOn: r.start_date,
      hrComments: r.admin_comment || undefined,
    }));
    setLeaveRequests(mapped);

    const counts: Record<string, number> = { paid: 0, sick: 0, unpaid: 0 };
    res.leave_requests.forEach((r) => { counts[r.leave_type] = (counts[r.leave_type] || 0) + 1; });
    setLeaveTypeData([
      { name: "Paid Leave", value: counts.paid, color: "#8b5cf6" },
      { name: "Sick Leave", value: counts.sick, color: "#f59e0b" },
      { name: "Unpaid Leave", value: counts.unpaid, color: "#ef4444" },
    ]);
  }

  async function loadTodaysAttendance(): Promise<Map<number, AttendanceRecord>> {
    const res = await apiFetch<{ attendance: ApiAttendanceRow[]; date: string }>("/api/attendance/all");
    const byUser = new Map<number, AttendanceRecord>();
    res.attendance.forEach((a) => {
      byUser.set(a.user_id, {
        userId: a.user_id,
        employeeId: a.employee_id,
        employeeName: a.full_name || a.employee_id,
        department: "",
        date: a.date,
        checkIn: formatTime(a.check_in),
        checkOut: formatTime(a.check_out),
        status: apiStatusToLabel[a.status] ?? "Present",
      });
    });
    setTodaysAttendance(Array.from(byUser.values()));
    return byUser;
  }

  async function loadAttendanceTrend() {
    const days: AttendanceTrendPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      try {
        const res = await apiFetch<{ attendance: ApiAttendanceRow[] }>(`/api/attendance/all?date=${dateStr}`);
        const present = res.attendance.filter((a) => a.status === "present").length;
        days.push({ day: d.toLocaleDateString(undefined, { weekday: "short" }), present });
      } catch {
        days.push({ day: d.toLocaleDateString(undefined, { weekday: "short" }), present: 0 });
      }
    }
    setAttendanceTrend(days);
  }

  async function loadAll() {
    const attendanceByUser = await loadTodaysAttendance();
    await loadEmployees(attendanceByUser);
    await loadLeave();
    await loadAttendanceTrend();
  }

  useEffect(() => {
    apiFetch<{ role: string; employee_id: string }>("/auth/me")
      .then((me) => {
        if (me.role !== "admin") {
          navigate({ to: "/" });
          return;
        }
        setMyEmployeeId(me.employee_id);
        return loadAll();
      })
      .catch(() => navigate({ to: "/login" }))
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  if (!ready) return null;

  async function handleLogout() {
    try { await apiFetch("/auth/logout", { method: "POST" }); } finally {
      clearSession();
      navigate({ to: "/login" });
    }
  }

  const handleViewChange = (view: "admin" | "employee") => {
    if (view === "employee") navigate({ to: "/" });
  };

  async function handleSaveEmployee(empData: EmployeeData) {
    if (empData.userId) {
      await apiFetch(`/api/profile/${empData.userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          full_name: empData.name,
          job_title: empData.designation,
          department: empData.department,
          phone: empData.phone,
        }),
      });
      await apiFetch(`/api/payroll/${empData.userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          basic: empData.baseSalary,
          hra: empData.hra,
          allowances: empData.bonus,
          deductions: empData.deductions,
        }),
      });
    } else {
      // The new employee gets an emailed temporary password — the backend
      // refuses this call entirely if no SMTP provider is configured.
      const created = await apiFetch<{ id: number }>("/api/employees", {
        method: "POST",
        body: JSON.stringify({
          employee_id: empData.id,
          email: empData.email,
          full_name: empData.name,
          job_title: empData.designation,
          department: empData.department,
          phone: empData.phone,
        }),
      });
      await apiFetch(`/api/payroll/${created.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          basic: empData.baseSalary,
          hra: empData.hra,
          allowances: empData.bonus,
          deductions: empData.deductions,
        }),
      });
    }
    const byUser = await loadTodaysAttendance();
    await loadEmployees(byUser);
  }

  async function handleDeleteEmployee(id: string) {
    const emp = employees.find((e) => e.id === id);
    if (!emp) return;
    if (!confirm(`Remove ${emp.name} (${emp.id})? This cannot be undone.`)) return;
    await apiFetch(`/api/employees/${emp.userId}`, { method: "DELETE" });
    const byUser = await loadTodaysAttendance();
    await loadEmployees(byUser);
  }

  async function handleApproveLeave(id: string, hrComments: string) {
    await apiFetch(`/api/leave/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "approved", admin_comment: hrComments }),
    });
    await loadLeave();
  }

  async function handleRejectLeave(id: string, hrComments: string) {
    await apiFetch(`/api/leave/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "rejected", admin_comment: hrComments }),
    });
    await loadLeave();
  }

  async function handleUpdateSalary(employeeId: string, baseSalary: number, hra: number, bonus: number, deductions: number) {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;
    await apiFetch(`/api/payroll/${emp.userId}`, {
      method: "PATCH",
      body: JSON.stringify({ basic: baseSalary, hra, allowances: bonus, deductions }),
    });
    const byUser = await loadTodaysAttendance();
    await loadEmployees(byUser);
  }

  async function handleOverrideAttendance(record: AttendanceRecord) {
    await apiFetch("/api/attendance/override", {
      method: "POST",
      body: JSON.stringify({
        user_id: record.userId,
        date: record.date,
        status: statusToApi[record.status],
        check_in: record.checkIn,
        check_out: record.checkOut,
      }),
    });
    await loadTodaysAttendance();
  }

  const pendingLeavesCount = leaveRequests.filter((r) => r.status === "Pending").length;
  const presentToday = todaysAttendance.filter((r) => r.status === "Present").length;
  const thisMonthKey = new Date().toISOString().slice(0, 7);
  const newThisMonthCount = employees.filter((e) => e.joinDate?.startsWith(thisMonthKey)).length;
  const grandTotalPayroll = employees.reduce(
    (sum, emp) => sum + (emp.baseSalary + emp.hra + emp.bonus - emp.deductions),
    0
  );

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <HeaderNav
        currentView="admin"
        onViewChange={handleViewChange}
        pendingApprovalsCount={pendingLeavesCount}
        employeeId={myEmployeeId}
        onLogout={handleLogout}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <ShieldAlert className="h-4 w-4 text-primary" />
                HR Management Workspace
              </div>
              <h1 className="mt-1 flex flex-wrap items-baseline gap-x-3 text-3xl font-extrabold tracking-tight text-foreground">
                HR Admin & Operations Hub
                <span className="font-display text-2xl font-normal text-primary">— Every workday, aligned.</span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Centralized workforce management, leave approvals, attendance matrix, and payroll controls.
              </p>
            </div>

            <button
              onClick={() => { setEditingEmployee(null); setIsAddModalOpen(true); }}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Onboard Employee
            </button>
          </div>

          <StatCards
            totalEmployees={employees.length}
            activeCount={employees.length}
            presentToday={presentToday}
            pendingLeavesCount={pendingLeavesCount}
            monthlyPayrollTotal={grandTotalPayroll}
            newThisMonthCount={newThisMonthCount}
            onSelectTab={(tab) => setAdminTab(tab as any)}
          />

          <div className="border-b border-border">
            <nav className="-mb-px flex space-x-6 overflow-x-auto text-sm font-semibold">
              <button onClick={() => setAdminTab("overview")} className={`flex items-center gap-2 pb-3.5 pt-1 border-b-2 transition-all ${adminTab === "overview" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"}`}>
                <BarChart2 className="h-4 w-4" />
                Analytics & Overview
              </button>
              <button onClick={() => setAdminTab("employees")} className={`flex items-center gap-2 pb-3.5 pt-1 border-b-2 transition-all ${adminTab === "employees" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"}`}>
                <Users className="h-4 w-4" />
                Employee Directory ({employees.length})
              </button>
              <button onClick={() => setAdminTab("attendance")} className={`flex items-center gap-2 pb-3.5 pt-1 border-b-2 transition-all ${adminTab === "attendance" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"}`}>
                <Clock className="h-4 w-4" />
                Attendance Matrix
              </button>
              <button onClick={() => setAdminTab("leaves")} className={`flex items-center gap-2 pb-3.5 pt-1 border-b-2 transition-all ${adminTab === "leaves" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"}`}>
                <CalendarCheck className="h-4 w-4" />
                Leave Approvals
                {pendingLeavesCount > 0 && (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-600">{pendingLeavesCount}</span>
                )}
              </button>
              <button onClick={() => setAdminTab("payroll")} className={`flex items-center gap-2 pb-3.5 pt-1 border-b-2 transition-all ${adminTab === "payroll" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"}`}>
                <IndianRupee className="h-4 w-4" />
                Payroll Control
              </button>
            </nav>
          </div>

          {adminTab === "overview" && (
            <AnalyticsDashboard employees={employees} attendanceTrend={attendanceTrend} leaveTypeData={leaveTypeData} />
          )}

          {adminTab === "employees" && (
            <EmployeeTable
              employees={employees}
              onAddEmployee={() => { setEditingEmployee(null); setIsAddModalOpen(true); }}
              onEditEmployee={(emp) => { setEditingEmployee(emp); setIsAddModalOpen(true); }}
              onDeleteEmployee={handleDeleteEmployee}
            />
          )}

          {adminTab === "attendance" && (
            <AttendanceManagement records={todaysAttendance} onOverride={handleOverrideAttendance} />
          )}

          {adminTab === "leaves" && (
            <LeaveApprovalHub
              leaveRequests={leaveRequests}
              onApprove={handleApproveLeave}
              onReject={handleRejectLeave}
            />
          )}

          {adminTab === "payroll" && (
            <PayrollManagement employees={employees} onUpdateSalary={handleUpdateSalary} />
          )}
        </div>
      </main>

      <AddEditEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveEmployee}
        initialData={editingEmployee}
      />
    </div>
  );
}
