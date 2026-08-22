const API_BASE = import.meta.env.VITE_API_URL as string;
if (!API_BASE) {
  throw new Error("VITE_API_URL is not set — refusing to guess a backend URL");
}

const ROLE_KEY = "dayflow_role";

export function getRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ROLE_KEY);
}

export function setSession(role: string) {
	localStorage.setItem(ROLE_KEY, role);
}

export function clearSession() {
	localStorage.removeItem(ROLE_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
	const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
	const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "include" });
	if (res.status === 401) clearSession();
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
