import React, { useState, useEffect } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { HRMSStorage } from '../../services/hrmsStorage';
import {
  Building2,
  Clock,
  CalendarDays,
  CreditCard,
  User,
  TrendingUp,
  CheckCircle2,
  Play,
  Square,
  Coffee,
  IndianRupee,
  BadgeCheck,
  XCircle,
  CalendarCheck,
  FileText,
  BarChart3,
  LogOut,
  ChevronRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export const EmployeeDashboard: React.FC = () => {
  const { currentUser, setActiveTab, leaves, attendance, showToast, refreshData } = useHRMS();
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'profile' | 'attendance' | 'leaves' | 'payroll'>('overview');

  const [todayAttendance, setTodayAttendance] = useState(
    currentUser ? HRMSStorage.getTodayAttendance(currentUser.employeeId) : undefined
  );
  const [isCheckedIn, setIsCheckedIn] = useState(!!todayAttendance?.checkIn && !todayAttendance?.checkOut);
  const [secondsWorked, setSecondsWorked] = useState(14520); // ~4 hours
  const [isOnBreak, setIsOnBreak] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isCheckedIn && !isOnBreak) {
      interval = setInterval(() => {
        setSecondsWorked(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCheckedIn, isOnBreak]);

  const handleToggleCheckIn = () => {
    if (!currentUser) return;

    if (!isCheckedIn) {
      const updated = HRMSStorage.checkIn(currentUser.employeeId);
      setTodayAttendance(updated);
      setIsCheckedIn(true);
      setIsOnBreak(false);
      showToast('Checked in successfully! Shift timer active.', 'success');
    } else {
      const updated = HRMSStorage.checkOut(currentUser.employeeId);
      setTodayAttendance(updated);
      setIsCheckedIn(false);
      setIsOnBreak(false);
      showToast('Checked out successfully. Good work today!', 'info');
    }
    refreshData();
  };

  const handleToggleBreak = () => {
    if (!isCheckedIn) return;
    setIsOnBreak(!isOnBreak);
    showToast(
      isOnBreak ? 'Resumed working shift.' : 'Break timer started.',
      isOnBreak ? 'info' : 'success'
    );
  };

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const myLeaves = leaves.filter(
    l => currentUser && (l.employeeId === currentUser.employeeId || l.employeeName === currentUser.name)
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans dark:bg-[#090D16] dark:text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-6 py-3.5 dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* Left Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#714B67] to-[#4C2D43] text-white shadow-md shadow-[#714B67]/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  Dayflow
                </span>
                <span className="rounded-full bg-[#f5edf3] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#714B67] dark:bg-slate-800 dark:text-[#8E587E] border border-[#714B67]/20">
                  Odoo HRMS
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Every workday, perfectly aligned.
              </p>
            </div>
          </div>

          {/* Right Role Switcher & Profile Badge */}
          <div className="flex items-center gap-3">
            {/* Active Employee Role Pill */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <button className="flex items-center gap-1.5 rounded-lg bg-[#714B67] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm">
                <UserCheck className="h-3.5 w-3.5" />
                Employee Portal
              </button>
            </div>

            {/* Profile Avatar */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={currentUser?.name || 'User'}
                className="h-9 w-9 rounded-xl border border-[#714B67]/30 object-cover"
              />
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  {currentUser?.name || 'Alex Rivera'}
                </p>
                <p className="text-[10px] font-semibold text-[#714B67] dark:text-[#8E587E]">
                  {currentUser?.position || 'Software Engineer'}
                </p>
              </div>
              <button
                onClick={() => { window.location.href = '/login'; }}
                title="Logout"
                className="ml-1 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8 space-y-6">
        {/* Workspace Title Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#714B67] dark:text-[#8E587E]">
              <User className="h-3.5 w-3.5 text-[#00A09D]" />
              EMPLOYEE SELF-SERVICE WORKSPACE
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Employee Portal & Operations Hub
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Personal attendance matrix, leave management, profile details & payroll visibility.
            </p>
          </div>

          {/* Quick Clock In / Out Action Button */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Shift Timer
              </span>
              <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                {formatTimer(secondsWorked)}
              </span>
            </div>
            <button
              onClick={handleToggleCheckIn}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-md transition-all ${
                isCheckedIn
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : 'bg-[#00A09D] hover:bg-[#008280]'
              }`}
            >
              {isCheckedIn ? (
                <>
                  <Square className="h-3.5 w-3.5 fill-white" />
                  Clock Out
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-white" />
                  Clock In
                </>
              )}
            </button>
          </div>
        </div>

        {/* 4 KPI Metrics Row */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {/* Card 1: Shift Status */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">TODAY'S SHIFT</span>
              <Clock className="h-4 w-4 text-[#714B67]" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {formatTimer(secondsWorked)}
              </span>
            </div>
            <p className="mt-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              {isCheckedIn ? 'Currently Clocked In' : 'Off Shift'}
            </p>
          </div>

          {/* Card 2: Attendance Score */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">PUNCTUALITY SCORE</span>
              <TrendingUp className="h-4 w-4 text-[#00A09D]" />
            </div>
            <div className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
              98.4%
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full w-[98%] rounded-full bg-[#00A09D]"></div>
            </div>
            <p className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              On-time streak: 12 Workdays
            </p>
          </div>

          {/* Card 3: Paid Leave Available */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">LEAVE BALANCE</span>
              <CalendarDays className="h-4 w-4 text-[#714B67]" />
            </div>
            <div className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
              14 Days
            </div>
            <p className="mt-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              7 Sick • 3 Casual Available
            </p>
          </div>

          {/* Card 4: Estimated Payout */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">NET MONTHLY PAYOUT</span>
              <IndianRupee className="h-4 w-4 text-[#00A09D]" />
            </div>
            <div className="mt-3 text-2xl font-black text-slate-900 dark:text-white font-mono">
              ₹1,52,000
            </div>
            <p className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Disbursement: Sept 01, 2026
            </p>
          </div>
        </div>

        {/* Horizontal Navigation Tabs */}
        <div className="border-b border-slate-200/80 pb-px dark:border-slate-800">
          <nav className="flex space-x-6 overflow-x-auto">
            <button
              onClick={() => { setActiveSubTab('overview'); setActiveTab('dashboard'); }}
              className={`flex items-center gap-2 border-b-2 py-3 text-xs font-bold transition-all whitespace-nowrap ${
                activeSubTab === 'overview'
                  ? 'border-[#714B67] text-[#714B67] dark:border-[#8E587E] dark:text-[#8E587E]'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Overview & Analytics
            </button>

            <button
              onClick={() => { setActiveSubTab('profile'); setActiveTab('profiles'); }}
              className={`flex items-center gap-2 border-b-2 py-3 text-xs font-bold transition-all whitespace-nowrap ${
                activeSubTab === 'profile'
                  ? 'border-[#714B67] text-[#714B67] dark:border-[#8E587E] dark:text-[#8E587E]'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <User className="h-4 w-4" />
              My Profile Details
            </button>

            <button
              onClick={() => { setActiveSubTab('attendance'); setActiveTab('attendance'); }}
              className={`flex items-center gap-2 border-b-2 py-3 text-xs font-bold transition-all whitespace-nowrap ${
                activeSubTab === 'attendance'
                  ? 'border-[#714B67] text-[#714B67] dark:border-[#8E587E] dark:text-[#8E587E]'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Clock className="h-4 w-4" />
              Attendance Matrix
            </button>

            <button
              onClick={() => { setActiveSubTab('leaves'); setActiveTab('leaves'); }}
              className={`flex items-center gap-2 border-b-2 py-3 text-xs font-bold transition-all whitespace-nowrap ${
                activeSubTab === 'leaves'
                  ? 'border-[#714B67] text-[#714B67] dark:border-[#8E587E] dark:text-[#8E587E]'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <CalendarDays className="h-4 w-4" />
              Leave Requests ({myLeaves.filter(l => l.status === 'Pending').length})
            </button>

            <button
              onClick={() => { setActiveSubTab('payroll'); setActiveTab('payroll'); }}
              className={`flex items-center gap-2 border-b-2 py-3 text-xs font-bold transition-all whitespace-nowrap ${
                activeSubTab === 'payroll'
                  ? 'border-[#714B67] text-[#714B67] dark:border-[#8E587E] dark:text-[#8E587E]'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Payroll Control & Payslips
            </button>
          </nav>
        </div>

        {/* Dynamic Workspace Content Panel */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main 2-Column Workday Attendance Matrix */}
          <div className="md:col-span-2 space-y-6">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Weekly Attendance Matrix
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Daily check-in, check-out and total shift hours logged
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('attendance')}
                  className="text-xs font-bold text-[#714B67] hover:underline"
                >
                  View Full Logs →
                </button>
              </div>

              <div className="space-y-3">
                {[
                  { day: 'Monday (Aug 18)', checkIn: '09:02 AM', checkOut: '05:30 PM', hrs: '8h 28m', status: 'Present' },
                  { day: 'Tuesday (Aug 19)', checkIn: '08:58 AM', checkOut: '05:32 PM', hrs: '8h 34m', status: 'Present' },
                  { day: 'Wednesday (Aug 20)', checkIn: '09:05 AM', checkOut: '05:30 PM', hrs: '8h 25m', status: 'Present' },
                  { day: 'Thursday (Aug 21)', checkIn: '09:00 AM', checkOut: '01:30 PM', hrs: '4h 30m', status: 'Half-day' },
                  { day: 'Friday (Aug 22)', checkIn: '09:00 AM', checkOut: 'In Progress', hrs: formatTimer(secondsWorked), status: isCheckedIn ? 'Present' : 'Active Shift' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5edf3] text-[#714B67] font-bold text-xs">
                        {item.day.slice(0, 3)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {item.day}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Check-In: <span className="font-mono text-slate-800 dark:text-slate-200">{item.checkIn}</span> • Out: <span className="font-mono text-slate-800 dark:text-slate-200">{item.checkOut}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 block">
                        {item.status}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 mt-1 block">
                        {item.hrs}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* My Payroll Summary Table */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-x-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  My Salary Breakdown & Payslips
                </h3>
                <span className="text-xs font-bold text-[#00A09D]">
                  Status: Verified & Ready
                </span>
              </div>

              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200/80 dark:bg-slate-800/50 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">EMPLOYEE</th>
                    <th className="py-2.5 px-3">BASE SALARY</th>
                    <th className="py-2.5 px-3">ALLOWANCES</th>
                    <th className="py-2.5 px-3">TAX DEDUCTIONS</th>
                    <th className="py-2.5 px-3">NET PAYOUT</th>
                    <th className="py-2.5 px-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900 dark:text-white">{currentUser?.name || 'Alex Rivera'}</p>
                      <p className="text-[10px] text-slate-400 font-mono">EMP-101 • Engineering</p>
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold">₹1,20,000</td>
                    <td className="py-3 px-3 font-mono text-emerald-600 font-semibold">+₹38,000</td>
                    <td className="py-3 px-3 font-mono text-rose-600 font-semibold">-₹6,000</td>
                    <td className="py-3 px-3 font-mono font-bold text-[#714B67] dark:text-[#8E587E]">₹1,52,000</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setActiveTab('payroll')}
                        className="rounded-lg bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                      >
                        View Payslip
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Leave Status & Recent Activity */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  My Leave Requests
                </h3>
                <button
                  onClick={() => setActiveTab('leaves')}
                  className="text-xs font-bold text-[#714B67] hover:underline"
                >
                  Apply Leave +
                </button>
              </div>

              {myLeaves.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No active leave requests.</p>
              ) : (
                <div className="space-y-3">
                  {myLeaves.map(l => (
                    <div key={l.id} className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white capitalize">
                          {l.leaveType} Leave
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          l.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {l.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {l.startDate} to {l.endDate} ({l.totalDays} Days)
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions Card */}
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-[#f5edf3] to-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h4 className="text-xs font-bold text-[#714B67] dark:text-[#8E587E] uppercase tracking-wider">
                Quick Shortcuts
              </h4>
              <div className="mt-3 space-y-2">
                <button
                  onClick={() => setActiveTab('profiles')}
                  className="flex w-full items-center justify-between rounded-xl bg-white p-2.5 text-xs font-bold text-slate-700 shadow-sm border border-slate-200/80 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                >
                  <span>Update Profile Info</span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
                <button
                  onClick={() => setActiveTab('payroll')}
                  className="flex w-full items-center justify-between rounded-xl bg-white p-2.5 text-xs font-bold text-slate-700 shadow-sm border border-slate-200/80 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                >
                  <span>Download August Salary Slip</span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
