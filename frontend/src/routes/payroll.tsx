import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ApiError, apiFetch } from "../lib/api";

export const Route = createFileRoute("/payroll")({
  component: PayrollPage,
});

interface Payroll {
  user_id: number;
  basic: number;
  hra: number;
  allowances: number;
  deductions: number;
  net_pay: number;
  effective_from: string;
}

const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function PayrollPage() {
  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Payroll>("/api/payroll/me")
      .then((d) => { setPayroll(d); setLoading(false); })
      .catch((e) => {
        setError(e instanceof ApiError && e.status === 404 ? "No salary structure on file yet." : String(e));
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <a href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </a>

        <h1 className="text-2xl font-semibold tracking-tight">Payroll</h1>
        <p className="mt-1 text-sm text-muted-foreground">View salary slips and payment history</p>

        {loading && <p className="mt-10 text-center text-sm text-muted-foreground">Loading…</p>}
        {error && (
          <p className="mt-6 rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            {error}
          </p>
        )}

        {!loading && !error && payroll && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-baseline justify-between border-b border-border pb-4">
              <span className="text-sm font-medium text-muted-foreground">Net pay</span>
              <span className="text-2xl font-semibold tracking-tight tabular-nums">{fmt.format(payroll.net_pay)}</span>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Basic</dt><dd className="tabular-nums">{fmt.format(payroll.basic)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">HRA</dt><dd className="tabular-nums">{fmt.format(payroll.hra)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Allowances</dt><dd className="tabular-nums">{fmt.format(payroll.allowances)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Deductions</dt><dd className="tabular-nums text-destructive">−{fmt.format(payroll.deductions)}</dd></div>
            </dl>
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              Effective from {payroll.effective_from} · Read-only
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
