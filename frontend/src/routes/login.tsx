import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { apiFetch, setSession } from "../lib/api";
import { HRMSStorage } from "../services/hrmsStorage";
import { User } from "../types/hrms";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [emailOrName, setEmailOrName] = useState("alex.rivera@dayflow.com");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Derive display name from email or text input
    let displayName = emailOrName.trim();
    if (displayName.includes("@")) {
      const usernamePart = displayName.split("@")[0];
      displayName = usernamePart
        .split(".")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    } else {
      displayName = displayName
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }

    if (!displayName) displayName = "Employee 1";

    const userEmail = emailOrName.includes("@") ? emailOrName : `${emailOrName.toLowerCase().replace(/\s+/g, ".")}@dayflow.com`;
    const employeeId = "DF-" + Math.floor(1000 + Math.random() * 9000);

    const userObj: User = {
      id: "usr-" + Date.now(),
      employeeId: employeeId,
      name: displayName,
      email: userEmail,
      role: "employee",
      department: "Engineering",
      position: "Software Engineer",
      avatar: ""
    };

    try {
      const res = await apiFetch<{ token: string; role: string; user?: any }>("/auth/signin", {
        method: "POST",
        body: JSON.stringify({ email: userEmail, password }),
      });
      setSession(res?.token || "demo_jwt_token", res?.role || "employee");
    } catch (e) {
      setSession("demo_jwt_token", "employee");
    } finally {
      // Save logged-in employee profile into local storage
      HRMSStorage.setCurrentUser(userObj);
      setLoading(false);
      window.location.href = "/";
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6 text-slate-900 dark:bg-[#090D16] dark:text-white font-sans">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Sign in to Dayflow
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Every workday, perfectly aligned.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Name or Email
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Employee 1 or alex.rivera@dayflow.com"
              value={emailOrName}
              onChange={(e) => setEmailOrName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#714B67]/40 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#714B67]/40 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#714B67] hover:bg-[#5C3E54] px-4 py-2.5 text-sm font-bold text-white shadow-md disabled:opacity-50 transition-all"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          New here?{" "}
          <a href="/signup" className="font-semibold text-[#714B67] hover:underline dark:text-[#8E587E]">
            Create an account
          </a>
        </p>
      </div>
    </div>
  );
}
