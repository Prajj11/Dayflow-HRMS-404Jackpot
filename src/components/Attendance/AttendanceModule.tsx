import React, { useState } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { HRMSStorage } from '../../services/hrmsStorage';
import { AttendanceStatus } from '../../types/hrms';
import {
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck,
  Search,
  Filter,
  Play,
  Square,
  ShieldCheck
} from 'lucide-react';

export const AttendanceModule: React.FC = () => {
  const { attendance, activeRole, currentUser, refreshData, showToast } = useHRMS();
  const [rangeView, setRangeView] = useState<'daily' | 'weekly'>('daily');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const isHR = activeRole === 'hr';

  // Filter attendance records
  const filteredRecords = attendance.filter(rec => {
    // If regular employee, only show own records
    if (!isHR && currentUser) {
      if (rec.employeeId !== currentUser.employeeId && rec.employeeName !== currentUser.name) {
        return false;
      }
    }

    if (statusFilter !== 'all' && rec.status !== statusFilter) {
      return false;
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        rec.employeeName.toLowerCase().includes(q) ||
        rec.employeeId.toLowerCase().includes(q) ||
        rec.date.includes(q)
      );
    }

    return true;
  });

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'Present':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Present
          </span>
        );
      case 'Half-day':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <AlertTriangle className="h-3 w-3" />
            Half-Day
          </span>
        );
      case 'Leave':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-extrabold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <Calendar className="h-3 w-3" />
            On Leave
          </span>
        );
      case 'Absent':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-extrabold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
            <XCircle className="h-3 w-3" />
            Absent
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            <Clock className="h-4 w-4" />
            Attendance & Time Tracking
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {isHR ? 'Company Attendance Ledger' : 'My Workday Attendance Logs'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isHR
              ? 'Monitor employee check-in/out timestamps, hours logged, and attendance statuses.'
              : 'Track your daily check-in, check-out times, total hours worked, and status.'}
          </p>
        </div>

        {/* View Controls: Daily / Weekly */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => setRangeView('daily')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                rangeView === 'daily'
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-300'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Daily View
            </button>
            <button
              onClick={() => setRangeView('weekly')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                rangeView === 'weekly'
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-300'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Weekly Overview
            </button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="all">All Statuses</option>
            <option value="Present">Present</option>
            <option value="Half-day">Half-Day</option>
            <option value="Leave">On Leave</option>
            <option value="Absent">Absent</option>
          </select>
        </div>

        {isHR && (
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by employee name or ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full md:w-64 rounded-lg border border-slate-200 pl-8 pr-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        )}
      </div>

      {/* Attendance Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 dark:border-slate-800 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3">Check-In Time</th>
                <th className="py-3 px-3">Check-Out Time</th>
                <th className="py-3 px-3">Total Worked Hours</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    No attendance records found for the selected filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white font-mono">
                      {rec.date}
                    </td>
                    <td className="py-3 px-3">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{rec.employeeName}</p>
                        <p className="text-[10px] text-slate-400">{rec.employeeId}</p>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                      {rec.checkIn || '--:--'}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                      {rec.checkOut || (rec.checkIn ? 'Active (Working)' : '--:--')}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {rec.totalHours > 0 ? `${rec.totalHours} hrs` : '0 hrs'}
                    </td>
                    <td className="py-3 px-3">
                      {getStatusBadge(rec.status)}
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                      {rec.notes || 'Regular workday'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
