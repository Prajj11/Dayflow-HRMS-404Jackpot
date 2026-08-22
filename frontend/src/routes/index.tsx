import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Calendar,
  Clock,
  DoorOpen,
  Sparkles,
  Users,
} from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/")({
  component: Index,
});

type Range = "daily" | "weekly";

interface Summary {
  date: string;
  range: Range;
  active_users: number;
  total_users: number;
  peak_hour: number;
  peak_label: string;
  total_doors: number;
  silent_doors: number;
  silent_door_names: string[];
  total_entries: number;
}

interface HourBucket {
  hour: number;
  entries: number;
}

interface DoorRow {
  door_name: string;
  entries: number;
  last_activity: string | null;
}

interface SummaryResponse {
  summary: Summary;
  hourly: HourBucket[];
  doors: DoorRow[];
}

function formatHour(h: number): string {
  const suffix = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${suffix}`;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "No activity";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildSentence(s: Summary): { subject: string; peak: string; silent: string | null } {
  const rangeWord = s.range === "daily" ? `on ${s.date}` : `this week (${s.date})`;
  const subject = `${s.active_users} of ${s.total_users} employees badged in ${rangeWord}.`;
  const peak = `Entries peaked around ${formatHour(s.peak_hour)} (${s.peak_label}).`;
  const silent =
    s.silent_doors > 0
      ? `${s.silent_doors} ${s.silent_doors === 1 ? "door" : "doors"} saw no activity${s.silent_door_names.length > 0 ? ": " + s.silent_door_names.join(", ") : ""}.`
      : null;
  return { subject, peak, silent };
}

const API_BASE = import.meta.env.VITE_API_URL as string;
if (!API_BASE) {
  throw new Error("VITE_API_URL is not set — refusing to guess a backend URL");
}

const dayFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const clockFmt = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });

const LOG_PAGE = 300;

// The calendar hands back a Date at local midnight. toISOString would convert
// that to UTC and, anywhere east of Greenwich, roll it back to the previous day.
function toDateStr(d: Date) {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function Index() {
  const [range, setRange] = useState<Range>("daily");
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // calendar
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showCal, setShowCal] = useState(false);
  const [warming, setWarming] = useState(false);
  const [activeDates, setActiveDates] = useState<Set<string>>(new Set());
  const [calMonth, setCalMonth] = useState<Date>(new Date());
  const calRef = useRef<HTMLDivElement>(null);

  // close calendar on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (calRef.current && !calRef.current.contains(e.target as Node)) {
        setShowCal(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function fetchActiveDates(month: Date) {
    const m = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    fetch(`${API_BASE}/api/active-dates?month=${m}`)
      .then((r) => r.json())
      .then((d: { dates: string[] }) => setActiveDates(new Set(d.dates)))
      .catch(() => {});
  }

  // fetch active dates when calendar opens
  useEffect(() => {
    if (showCal) fetchActiveDates(calMonth);
  }, [showCal, calMonth]);

  function selectDate(d: Date | undefined) {
    setSelectedDate(d);
    setShowCal(false);
    if (!d) return;
    // warm ±7 day cache in background
    setWarming(true);
    fetch(`${API_BASE}/cache/warm?date=${toDateStr(d)}`)
      .finally(() => setWarming(false));
  }

  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState<{ q: string; a: string }[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [askDisambig, setAskDisambig] = useState<string[] | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  function resetAsk() {
    setThread([]);
    setSessionId("");
    setAskDisambig(null);
    setAskError(null);
    setQuestion("");
  }

  function submitAsk(q: string) {
    if (!q.trim()) return;
    setAskLoading(true);
    setAskDisambig(null);
    setAskError(null);
    setPending(q);
    fetch(`${API_BASE}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: q,
        date: selectedDate ? toDateStr(selectedDate) : undefined,
        session_id: sessionId || undefined,
      }),
    })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d: { answer?: string; disambiguate?: string[]; session_id?: string }) => {
        if (d.session_id) setSessionId(d.session_id);
        if (d.disambiguate) setAskDisambig(d.disambiguate);
        else if (d.answer) setThread((t) => [...t, { q, a: d.answer! }]);
        setAskLoading(false);
        setPending(null);
      })
      .catch((e) => { setAskError(String(e)); setAskLoading(false); setPending(null); });
  }

  useEffect(() => {
    setLoading(true);
    setError(null);
    setDigestText("");
    setDigestOpen(false);
    const dateParam = selectedDate ? `&date=${toDateStr(selectedDate)}` : "";
    fetch(`${API_BASE}/summary?range=${range}${dateParam}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<SummaryResponse>;
      })
      .then((d) => {
        setData(d);
        setLoading(false);
        // the backend anchors to the latest event, which is usually not the
        // current month — open the calendar where the data actually is
        if (!selectedDate) {
          const anchor = d.summary.date.slice(0, 10);
          if (/^\d{4}-\d{2}-\d{2}$/.test(anchor)) {
            const [y, m] = anchor.split("-").map(Number);
            setCalMonth(new Date(y, m - 1, 1));
          }
        }
      })
      .catch((e) => { setError(String(e)); setLoading(false); });
  }, [range, selectedDate]);

  const sentence = useMemo(() => data ? buildSentence(data.summary) : null, [data]);
  const sortedDoors = useMemo(() => {
    if (!data) return [];
    return [...data.doors].sort((a, b) => {
      if (a.entries === 0 && b.entries !== 0) return -1;
      if (b.entries === 0 && a.entries !== 0) return 1;
      return b.entries - a.entries;
    });
  }, [data]);

  const peakEntries = data ? Math.max(...data.hourly.map((h) => h.entries), 0) : 0;

  // Doors modal
  const [doorsOpen, setDoorsOpen] = useState(false);

  // Active users modal
  const [usersOpen, setUsersOpen] = useState(false);
  const [activeUsers, setActiveUsers] = useState<{ user_name: string; entries: number; first_entry: string; last_entry: string }[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  function openActiveUsers() {
    if (!data) return;
    setUsersOpen(true);
    setUsersLoading(true);
    const dateStr = data.summary.date;
    let start: string, end: string;
    if (range === "weekly") {
      const parts = dateStr.split(" – ");
      start = parts[0]; end = parts[parts.length - 1];
    } else {
      start = end = dateStr;
    }
    fetch(`${API_BASE}/api/active-users?start=${start}&end=${end}`)
      .then((r) => r.json())
      .then((d: { users: typeof activeUsers }) => { setActiveUsers(d.users); setUsersLoading(false); })
      .catch(() => setUsersLoading(false));
  }

  // Activity log modal
  const [logOpen, setLogOpen] = useState(false);
  const [logEvents, setLogEvents] = useState<{ user_name: string; door_name: string; time: string; access_method: string }[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logShown, setLogShown] = useState(LOG_PAGE);

  // Detailed digest panel
  const [digestOpen, setDigestOpen] = useState(false);
  const [digestText, setDigestText] = useState("");
  const [digestSource, setDigestSource] = useState("");
  const [digestLoading, setDigestLoading] = useState(false);

  function toggleDigest() {
    if (digestOpen) {
      setDigestOpen(false);
      return;
    }
    setDigestOpen(true);
    if (digestText || !data) return;
    setDigestLoading(true);
    const dateStr = data.summary.date;
    let start: string, end: string;
    if (range === "weekly") {
      const parts = dateStr.split(" – ");
      start = parts[0]; end = parts[parts.length - 1];
    } else {
      start = end = dateStr;
    }
    fetch(`${API_BASE}/api/digest?start=${start}&end=${end}`)
      .then((r) => r.json())
      .then((d: { digest: string; source: string }) => {
        setDigestText(d.digest);
        setDigestSource(d.source);
        setDigestLoading(false);
      })
      .catch(() => setDigestLoading(false));
  }

  function openActivityLog() {
    if (!data) return;
    setLogOpen(true);
    setLogLoading(true);
    setLogShown(LOG_PAGE);
    // derive dates from the summary's date string to stay in sync
    const dateStr = data.summary.date; // "YYYY-MM-DD" or "YYYY-MM-DD – YYYY-MM-DD"
    let start: string, end: string;
    if (range === "weekly") {
      const parts = dateStr.split(" – ");
      start = parts[0]; end = parts[parts.length - 1];
    } else {
      start = end = dateStr;
    }
    fetch(`${API_BASE}/api/activity-log?start=${start}&end=${end}`)
      .then((r) => r.json())
      .then((d: { events: typeof logEvents }) => { setLogEvents(d.events); setLogLoading(false); })
      .catch(() => setLogLoading(false));
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Activity className="h-3.5 w-3.5" />
              Activity Digest
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Access control overview
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{data?.summary.date ?? "—"}</p>
          </div>
          <div className="flex items-center gap-3">
          {/* Calendar picker */}
          <div className="relative" ref={calRef}>
            <button
              onClick={() => setShowCal((v) => !v)}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {selectedDate ? toDateStr(selectedDate) : "Pick date"}
              {warming && <span className="ml-1 text-xs text-muted-foreground">warming…</span>}
            </button>
            {showCal && (
              <div className="absolute right-0 top-full z-50 mt-2 rounded-2xl border border-border bg-card shadow-lg p-3">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={selectDate}
                  month={calMonth}
                  onMonthChange={(m) => setCalMonth(m)}
                  captionLayout="dropdown"
                  modifiers={{
                    hasActivity: (d) => activeDates.has(toDateStr(d)),
                  }}
                  modifiersStyles={{
                    hasActivity: { position: "relative" },
                  }}
                  components={{
                    DayButton: ({ day, modifiers, ...props }) => (
                      <button {...props} style={{ position: "relative" }}>
                        {day.date.getDate()}
                        {activeDates.has(toDateStr(day.date)) && (
                          <span style={{
                            position: "absolute",
                            bottom: 2,
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: "#22c55e",
                            display: "block",
                          }} />
                        )}
                      </button>
                    ),
                  }}
                />
                {selectedDate && (
                  <button
                    onClick={() => selectDate(undefined)}
                    className="mt-2 w-full rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
                  >
                    Clear — use today
                  </button>
                )}
              </div>
            )}
          </div>

          <div
            role="tablist"
            aria-label="Time range"
            className="inline-flex rounded-lg border border-border bg-card p-1"
          >
            {(["daily", "weekly"] as const).map((r) => (
              <button
                key={r}
                role="tab"
                aria-selected={range === r}
                onClick={() => setRange(r)}
                className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  range === r
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r === "daily"
                  ? selectedDate ? selectedDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "Today"
                  : selectedDate ? `Week of ${selectedDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "This Week"
                }
              </button>
            ))}
          </div>
          </div>
        </header>

        {loading && (
          <div className="flex items-center justify-center py-32 text-muted-foreground text-sm">
            Loading…
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-destructive bg-destructive/10 p-6 text-sm text-destructive">
            Failed to load: {error}
          </div>
        )}

        {/* Ask */}
        <section className="mb-8">
          <form
            onSubmit={(e) => { e.preventDefault(); submitAsk(question); setQuestion(""); }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={thread.length ? "Ask a follow-up…" : "Ask a question — e.g. how many times did Aditya clock in this week?"}
              className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="submit"
              disabled={askLoading || !question.trim()}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {askLoading ? "…" : "Ask"}
            </button>
          </form>

          {askError && (
            <p className="mt-2 text-xs text-destructive">{askError}</p>
          )}

          {/* one answer reads as a plain result card; a follow-up turns the
              same space into a transcript so the thread is legible */}
          {thread.length === 1 && !pending && (
            <div className="mt-3 rounded-xl border border-border bg-card px-5 py-3 text-sm text-foreground">
              {thread[0].a}
            </div>
          )}

          {(thread.length > 1 || (thread.length > 0 && pending)) && (
            <div className="mt-3 space-y-3 rounded-xl border border-border bg-card px-5 py-4">
              {thread.map((t, i) => (
                <div key={i} className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">{t.q}</p>
                  <p className="text-sm text-foreground">{t.a}</p>
                </div>
              ))}
              {pending && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">{pending}</p>
                  <p className="text-sm text-muted-foreground">…</p>
                </div>
              )}
            </div>
          )}

          {thread.length > 0 && (
            <button
              onClick={resetAsk}
              className="mt-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Start over
            </button>
          )}

          {askDisambig && (
            <div className="mt-3 rounded-xl border border-border bg-card px-5 py-3 text-sm">
              <p className="mb-2 text-muted-foreground">Multiple matches — who did you mean?</p>
              <div className="flex flex-wrap gap-2">
                {askDisambig.map((name) => (
                  <button
                    key={name}
                    onClick={() => { setQuestion(name); submitAsk(name); setAskDisambig(null); }}
                    className="rounded-lg border border-border bg-background px-3 py-1 text-xs font-medium hover:bg-accent"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {!loading && !error && data && sentence && (
          <>
            {/* Hero summary card */}
            <section className="mb-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
              <div className="flex gap-5">
                <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:flex">
                  <Sparkles className="h-5 w-5" />
                </div>
                <p className="text-xl leading-relaxed font-medium tracking-tight text-foreground sm:text-2xl">
                  <span>{sentence.subject}</span>{" "}
                  <span className="text-muted-foreground">{sentence.peak}</span>
                  {sentence.silent && (
                    <>
                      {" "}
                      <span className="text-[color:var(--warning)]">
                        {sentence.silent}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div className="mt-5 border-t border-border pt-4">
                <button
                  onClick={toggleDigest}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {digestOpen ? "Hide detailed digest" : "Read detailed digest"}
                </button>
                {digestOpen && (
                  <div className="mt-4">
                    {digestLoading ? (
                      <p className="text-sm text-muted-foreground">Composing digest…</p>
                    ) : digestText ? (
                      <>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                          {digestText}
                        </p>
                        <p className="mt-3 text-xs text-muted-foreground/70">
                          {digestSource === "model"
                            ? "Narrated by model from verified aggregates; names resolved locally."
                            : "Composed directly from database aggregates."}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Couldn't load the digest.</p>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Stat tiles */}
            <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile
                icon={<Users className="h-4 w-4" />}
                label="Active users"
                value={`${data.summary.active_users}`}
                hint={`of ${data.summary.total_users}`}
                onClick={openActiveUsers}
              />
              <StatTile
                icon={<DoorOpen className="h-4 w-4" />}
                label="Doors reporting"
                value={`${data.summary.total_doors - data.summary.silent_doors}`}
                hint={`of ${data.summary.total_doors}`}
                onClick={() => setDoorsOpen(true)}
              />
              <StatTile
                icon={<Clock className="h-4 w-4" />}
                label="Peak hour"
                value={formatHour(data.summary.peak_hour)}
                hint={data.summary.peak_label}
              />
              <StatTile
                icon={<Activity className="h-4 w-4" />}
                label="Total entries"
                value={data.summary.total_entries.toLocaleString()}
                hint={range === "daily" ? (selectedDate ? toDateStr(selectedDate) : "today") : "this week"}
                onClick={openActivityLog}
              />
            </section>

            {/* Chart */}
            <section className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold tracking-tight">
                  Entries by hour
                </h2>
                <span className="text-xs text-muted-foreground">
                  Peak {peakEntries.toLocaleString()} @ {formatHour(data.summary.peak_hour)}
                </span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.hourly}
                    margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid
                      vertical={false}
                      stroke="var(--border)"
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      dataKey="hour"
                      tickFormatter={(h) => formatHour(h).replace(" ", "")}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--accent)" }}
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "var(--popover-foreground)",
                      }}
                      labelFormatter={(h) => formatHour(h as number)}
                      formatter={(v: number) => [v.toLocaleString(), "Entries"]}
                    />
                    <Bar
                      dataKey="entries"
                      fill="var(--primary)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Door table */}
            <section className="rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex items-baseline justify-between border-b border-border px-6 py-4">
                <h2 className="text-sm font-semibold tracking-tight">Doors</h2>
                <span className="text-xs text-muted-foreground">
                  {data.summary.silent_doors} silent · {data.summary.total_doors} total
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3 text-right font-medium w-10">#</th>
                      <th className="px-6 py-3 font-medium">Door</th>
                      <th className="px-6 py-3 text-right font-medium">Entries</th>
                      <th className="px-6 py-3 text-right font-medium">Last activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDoors.map((d, i) => {
                      const silent = d.entries === 0;
                      return (
                        <tr
                          key={d.door_name}
                          className={`border-t border-border ${
                            silent ? "bg-[color:var(--warning-surface)]/40" : ""
                          }`}
                        >
                          <td className="px-4 py-3 tabular-nums text-muted-foreground text-right text-xs">{i + 1}</td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              {silent && (
                                <AlertTriangle className="h-3.5 w-3.5 text-[color:var(--warning)]" />
                              )}
                              <span
                                className={
                                  silent
                                    ? "font-medium text-[color:var(--warning)]"
                                    : "text-foreground"
                                }
                              >
                                {d.door_name}
                              </span>
                            </div>
                          </td>
                          <td
                            className={`px-6 py-3 text-right tabular-nums ${
                              silent ? "text-[color:var(--warning)]" : "text-foreground"
                            }`}
                          >
                            {d.entries.toLocaleString()}
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums text-muted-foreground">
                            {formatRelative(d.last_activity)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <p className="mt-6 text-xs text-muted-foreground">
              Aggregate counts only. No individual employee data is shown on this page.
            </p>
          </>
        )}
      </div>

      {/* Activity Log Modal */}
      {logOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setLogOpen(false)}
        >
          <div
            className="relative flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-sm font-semibold tracking-tight">
                Activity Log — {data?.summary.date ?? (selectedDate ? toDateStr(selectedDate) : toDateStr(new Date()))}
              </h2>
              <button
                onClick={() => setLogOpen(false)}
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto">
              {logLoading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                  Loading…
                </div>
              ) : logEvents.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                  No events found.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card border-b border-border text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium w-10">#</th>
                      <th className="px-6 py-3 text-left font-medium">Date & Time</th>
                      <th className="px-6 py-3 text-left font-medium">Name</th>
                      <th className="px-6 py-3 text-left font-medium">Door</th>
                      <th className="px-6 py-3 text-left font-medium">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {logEvents.slice(0, logShown).map((e, i) => {
                      const dt = new Date(e.time.replace(" ", "T"));
                      return (
                      <tr key={i} className="hover:bg-accent/40 transition-colors">
                        <td className="px-4 py-2.5 tabular-nums text-muted-foreground text-right text-xs">{i + 1}</td>
                        <td className="px-6 py-2.5 tabular-nums text-muted-foreground whitespace-nowrap">
                          {dayFmt.format(dt)} {clockFmt.format(dt)}
                        </td>
                        <td className="px-6 py-2.5 font-medium">{e.user_name}</td>
                        <td className="px-6 py-2.5 text-muted-foreground">{e.door_name}</td>
                        <td className="px-6 py-2.5 text-muted-foreground capitalize">{e.access_method.replace(/_/g, " ")}</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {logShown < logEvents.length && (
                <button
                  onClick={() => setLogShown((n) => n + LOG_PAGE)}
                  className="w-full border-t border-border py-3 text-xs text-muted-foreground hover:bg-accent/40 transition-colors"
                >
                  Load {Math.min(LOG_PAGE, logEvents.length - logShown)} more
                </button>
              )}
            </div>
            <div className="border-t border-border px-6 py-3 text-xs text-muted-foreground">
              Showing {Math.min(logShown, logEvents.length).toLocaleString()} of {logEvents.length.toLocaleString()} entries
            </div>
          </div>
        </div>
      )}

      {/* Active Users Modal */}
      {usersOpen && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setUsersOpen(false)}>
          <div className="relative flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-sm font-semibold tracking-tight">Active Users — {data.summary.date}</h2>
              <button onClick={() => setUsersOpen(false)} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
            </div>
            <div className="overflow-y-auto">
              {usersLoading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Loading…</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card border-b border-border text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium w-10">#</th>
                      <th className="px-6 py-3 text-left font-medium">Name</th>
                      <th className="px-6 py-3 text-right font-medium">Entries</th>
                      <th className="px-6 py-3 text-right font-medium">First In</th>
                      <th className="px-6 py-3 text-right font-medium">Last In</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {activeUsers.map((u, i) => (
                      <tr key={u.user_name} className="hover:bg-accent/40 transition-colors">
                        <td className="px-4 py-2.5 tabular-nums text-muted-foreground text-right text-xs">{i + 1}</td>
                        <td className="px-6 py-2.5 font-medium">{u.user_name}</td>
                        <td className="px-6 py-2.5 text-right tabular-nums">{u.entries.toLocaleString()}</td>
                        <td className="px-6 py-2.5 text-right text-muted-foreground whitespace-nowrap text-xs">
                          {new Date(u.first_entry.replace(" ", "T")).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-6 py-2.5 text-right text-muted-foreground whitespace-nowrap text-xs">
                          {new Date(u.last_entry.replace(" ", "T")).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="border-t border-border px-6 py-3 text-xs text-muted-foreground">
              {activeUsers.length} active users
            </div>
          </div>
        </div>
      )}

      {/* Doors Modal */}
      {doorsOpen && data && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDoorsOpen(false)}
        >
          <div
            className="relative flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-sm font-semibold tracking-tight">
                Reporting Doors — {data.summary.date}
              </h2>
              <button onClick={() => setDoorsOpen(false)} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
            </div>
            <div className="overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card border-b border-border text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium w-10">#</th>
                    <th className="px-6 py-3 text-left font-medium">Door Name</th>
                    <th className="px-6 py-3 text-right font-medium">Entries</th>
                    <th className="px-6 py-3 text-right font-medium">Last Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedDoors.filter(d => d.entries > 0).map((d, i) => (
                    <tr key={d.door_name} className="hover:bg-accent/40 transition-colors">
                      <td className="px-4 py-2.5 tabular-nums text-muted-foreground text-right text-xs">{i + 1}</td>
                      <td className="px-6 py-2.5 font-medium">{d.door_name}</td>
                      <td className="px-6 py-2.5 text-right tabular-nums">{d.entries.toLocaleString()}</td>
                      <td className="px-6 py-2.5 text-right text-muted-foreground whitespace-nowrap">{formatRelative(d.last_activity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-6 py-3 text-xs text-muted-foreground">
              {sortedDoors.filter(d => d.entries > 0).length} of {data.summary.total_doors} doors active
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-4 shadow-sm ${onClick ? "cursor-pointer hover:border-primary/50 hover:bg-accent/40 transition-colors" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        <span>{label}</span>
        {onClick && <span className="ml-auto text-[10px] text-primary/60">↗</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </span>
        {hint && (
          <span className="text-xs text-muted-foreground">{hint}</span>
        )}
      </div>
    </div>
  );
}
