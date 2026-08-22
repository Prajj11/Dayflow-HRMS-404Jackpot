import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { apiFetch } from "../lib/api";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

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
}

function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch<Profile>("/api/profile/me")
      .then((d) => { setProfile(d); setPhone(d.phone); setAddress(d.address); setLoading(false); })
      .catch((e) => { setError(String(e)); setLoading(false); });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const updated = await apiFetch<Profile>("/api/profile/me", {
        method: "PATCH",
        body: JSON.stringify({ phone, address }),
      });
      setProfile(updated);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <a href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </a>

        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Personal and job details</p>

        {loading && <p className="mt-10 text-center text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="mt-6 rounded-xl border border-destructive bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}

        {!loading && !error && profile && (
          <div className="mt-6 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold tracking-tight">Job details</h2>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-xs text-muted-foreground">Employee ID</dt><dd className="mt-0.5">{profile.employee_id}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Email</dt><dd className="mt-0.5">{profile.email}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Job title</dt><dd className="mt-0.5">{profile.job_title || "—"}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Department</dt><dd className="mt-0.5">{profile.department || "—"}</dd></div>
              </dl>
            </div>

            <form onSubmit={save} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold tracking-tight">Personal details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Phone</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Address</label>
                  <input value={address} onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
                  {saving ? "Saving…" : "Save changes"}
                </button>
                {saved && <span className="text-xs text-muted-foreground">Saved.</span>}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
