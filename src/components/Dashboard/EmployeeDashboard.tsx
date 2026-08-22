import React from 'react';
import { useHRMS } from '../../context/HRMSContext';
import {
  Users,
  UserCircle,
  Clock,
  CalendarCheck,
  IndianRupee,
  LogOut,
  BadgeCheck,
  XCircle,
  CreditCard
} from 'lucide-react';

interface AttendanceRow {
  date: string;
  dayName: string;
  status: 'present' | 'absent' | 'half_day' | 'leave';
}

const statusStyles: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900',
  absent: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900',
  half_day: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900',
  leave: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-900',
};

const statusLabels: Record<string, string> = {
  present: 'Present',
  absent: 'Absent',
  half_day: 'Half-day',
  leave: 'Leave',
};

export const EmployeeDashboard: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const { currentUser, setActiveTab, leaves, attendance } = useHRMS();

  const myLeaves = leaves.filter(
    l => currentUser && (l.employeeId === currentUser.employeeId || l.employeeName === currentUser.name)
  );

  const myAttendance = attendance.filter(
    a => currentUser && (a.employeeId === currentUser.employeeId || a.employeeName === currentUser.name)
  );

  const quickAccess = [
    {
      id: 'profiles',
      icon: <UserCircle className="h-5 w-5 text-[#714B67]" />,
      title: 'Profile',
      description: 'Personal, job details, salary structure, documents',
    },
    {
      id: 'attendance',
      icon: <Clock className="h-5 w-5 text-[#714B67]" />,
      title: 'Attendance',
      description: 'Daily and weekly view, check-in / check-out',
    },
    {
      id: 'leaves',
      icon: <CalendarCheck className="h-5 w-5 text-[#714B67]" />,
      title: 'Leave Requests',
      description: 'Apply for leave, track approval status',
    },
    {
      id: 'payroll',
      icon: <IndianRupee className="h-5 w-5 text-[#714B67]" />,
      title: 'Payroll',
      description: 'View salary slips and payment history',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans dark:bg-[#090D16] dark:text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header matching exact screenshot */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <Users className="h-3.5 w-3.5" />
              Dayflow
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Good to see you
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Every workday, perfectly aligned.
            </p>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4 text-slate-400" />
            Logout
          </button>
        </header>

        {/* 4 Quick Access Cards Grid (Exact screenshot match) */}
        <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {quickAccess.map(card => (
            <button
              key={card.title}
              onClick={() => setActiveTab(card.id)}
              className="group flex flex-col text-left rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-[#714B67]/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5edf3] text-[#714B67] dark:bg-slate-800 transition-colors">
                {card.icon}
              </div>
              <h2 className="mt-4 text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                {card.title}
              </h2>
              <p className="mt-1 text-xs text-slate-400 leading-normal dark:text-slate-400">
                {card.description}
              </p>
            </button>
          ))}
        </section>

        {/* Bottom 2-Column Section */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Left Card: This week's attendance */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:col-span-2 flex flex-col justify-between min-h-[180px]">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                This week's attendance
              </h2>
              <button
                onClick={() => setActiveTab('attendance')}
                className="text-xs font-semibold text-[#714B67] hover:underline dark:text-[#8E587E]"
              >
                View all
              </button>
            </div>

            {myAttendance.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                No attendance yet — check in from the Attendance page.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-5 gap-2">
                {[
                  { date: 'Mon', status: 'present' },
                  { date: 'Tue', status: 'present' },
                  { date: 'Wed', status: 'present' },
                  { date: 'Thu', status: 'half_day' },
                  { date: 'Fri', status: 'present' },
                ].map(d => (
                  <div
                    key={d.date}
                    className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-2 py-3 text-center dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <span className="text-xs font-semibold text-slate-400">
                      {d.date}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusStyles[d.status]}`}
                    >
                      {statusLabels[d.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Right Card: Recent activity */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 min-h-[180px]">
            <h2 className="mb-4 text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              Recent activity
            </h2>

            {myLeaves.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">
                No recent activity.
              </p>
            ) : (
              <ul className="space-y-3">
                {myLeaves.slice(0, 3).map(l => (
                  <li key={l.id} className="flex gap-2.5 text-xs">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                      {l.status === 'Approved' ? (
                        <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                      ) : l.status === 'Rejected' ? (
                        <XCircle className="h-3.5 w-3.5 text-rose-600" />
                      ) : (
                        <CalendarCheck className="h-3.5 w-3.5 text-amber-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                        {l.leaveType} leave is {l.status.toLowerCase()}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {l.startDate} – {l.endDate}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
