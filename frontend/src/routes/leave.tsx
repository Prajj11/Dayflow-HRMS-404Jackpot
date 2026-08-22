import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { apiFetch, getRole } from "../lib/api";

export const Route = createFileRoute("/leave")({
  component: LeavePage,
});

type LeaveType = "paid" | "sick" | "unpaid";
type LeaveStatus = "pending" | "approved" | "rejected";

interface LeaveRow {
  id: number;
  employee_id?: string;
  full_name?: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  remarks: string;
  status: LeaveStatus;
  admin_comment: string;
}

const statusStyles: Record<LeaveStatus, string> = {
  pending: "bg-[oklch(0.93_0.08_70)] text-[oklch(0.4_0.12_70)]",
  approved: "bg-[oklch(0.93_0.06_150)] text-[oklch(0.35_0.1_150)]",
  rejected: "bg-[oklch(0.93_0.06_25)] text-[oklch(0.4_0.15_25)]",
};

function LeavePage() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => setIsAdmin(getRole() === "admin"), []);
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [leaveType, setLeaveType] = useState<LeaveType>("paid");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    const path = isAdmin ? "/api/leave/all" : "/api/leave/me";
    apiFetch<{ leave_requests: LeaveRow[] }>(path)
      .then((d) => { setRows(d.leave_requests); setLoading(false); })
      .catch((e) => { setError(String(e)); setLoading(false); });
  }

  useEffect(load, [isAdmin]);

  async function submitLeave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await apiFetch("/api/leave", {
        method: "POST",
        body: JSON.stringify({ leave_type: leaveType, start_date: startDate, end_date: endDate, remarks }),
      });
      setStartDate(""); setEndDate(""); setRemarks("");
      load();
    } catch (e) {
      setFormError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function review(id: number, status: "approved" | "rejected") {
    await apiFetch(`/api/leave/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, admin_comment: "" }),
    });
    load();
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <a href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </a>

        <h1 className="text-2xl font-semibold tracking-tight">Leave Requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin ? "Review and approve time-off requests" : "Apply for leave, track approval status"}
        </p>

        {!isAdmin && (
          <form onSubmit={submitLeave} className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold tracking-tight">Apply for leave</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Type</label>
                <div className="inline-flex w-full rounded-lg border border-border bg-background p-1">
                  {(["paid", "sick", "unpaid"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setLeaveType(t)}
                      className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium capitalize transition-colors ${
                        leaveType === t ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div />
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Start date</label>
                <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">End date</label>
                <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Remarks</label>
                <input value={remarks} onChange={(e) => setRemarks(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </div>
            {formError && <p className="mt-3 text-xs text-destructive">{formError}</p>}
            <button type="submit" disabled={submitting} className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {submitting ? "Submitting…" : "Submit request"}
            </button>
          </form>
        )}

        {loading && <p className="mt-6 py-10 text-center text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="mt-6 rounded-xl border border-destructive bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}

        {!loading && !error && (
          <div className="mt-6 rounded-2xl border border-border bg-card shadow-sm">
            {rows.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">No leave requests.</p>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((l) => (
                  <li key={l.id} className="px-6 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        {isAdmin && <p className="text-sm font-medium">{l.full_name} · {l.employee_id}</p>}
                        <p className="text-sm text-foreground capitalize">{l.leave_type} leave — {l.start_date} to {l.end_date}</p>
                        {l.remarks && <p className="mt-0.5 text-xs text-muted-foreground">{l.remarks}</p>}
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusStyles[l.status]}`}>
                        {l.status}
                      </span>
                    </div>
                    {isAdmin && l.status === "pending" && (
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => review(l.id, "approved")} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                          Approve
                        </button>
                        <button onClick={() => review(l.id, "rejected")} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent">
                          Reject
                        </button>
                      </div>
                    )}
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
