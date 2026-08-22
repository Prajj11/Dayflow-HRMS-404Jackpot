import React, { useState, useEffect } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { HRMSStorage } from '../../services/hrmsStorage';
import {
  Clock,
  CalendarDays,
  CreditCard,
  User,
  CheckCircle2,
  Play,
  Square,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Award
} from 'lucide-react';

export const EmployeeDashboard: React.FC = () => {
  const { currentUser, setActiveTab, leaves, showToast, refreshData } = useHRMS();
  const [todayAttendance, setTodayAttendance] = useState(
    currentUser ? HRMSStorage.getTodayAttendance(currentUser.employeeId) : undefined
  );
  const [isCheckedIn, setIsCheckedIn] = useState(!!todayAttendance?.checkIn && !todayAttendance?.checkOut);
  const [secondsWorked, setSecondsWorked] = useState(14520); // ~4 hours initial timer

  useEffect(() => {
    let interval: any;
    if (isCheckedIn) {
      interval = setInterval(() => {
        setSecondsWorked(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCheckedIn]);

  const handleToggleCheckIn = () => {
    if (!currentUser) return;

    if (!isCheckedIn) {
      const updated = HRMSStorage.checkIn(currentUser.employeeId);
      setTodayAttendance(updated);
      setIsCheckedIn(true);
      showToast('Checked in successfully! Attendance clock active.', 'success');
    } else {
      const updated = HRMSStorage.checkOut(currentUser.employeeId);
      setTodayAttendance(updated);
      setIsCheckedIn(false);
      showToast('Checked out successfully. Good work today!', 'info');
    }
    refreshData();
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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-800 p-6 text-white shadow-xl shadow-indigo-500/10">
        <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 text-indigo-200 text-xs font-semibold uppercase tracking-wider">
              <Award className="h-4 w-4" />
              Dayflow Employee Portal
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Welcome back, {currentUser?.name || 'Employee'}! 👋
            </h1>
            <p className="mt-1 text-xs text-indigo-100 max-w-xl">
              {currentUser?.position} • {currentUser?.department} • ID: {currentUser?.employeeId}
            </p>
          </div>

          {/* Quick Access Card Pill */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('profiles')}
              className="flex items-center gap-1.5 rounded-xl bg-white/10 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-all border border-white/10"
            >
              <User className="h-4 w-4" />
              My Profile
            </button>
            <button
              onClick={() => setActiveTab('leaves')}
              className="flex items-center gap-1.5 rounded-xl bg-white/10 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-all border border-white/10"
            >
              <CalendarDays className="h-4 w-4" />
              Apply Leave
            </button>
            <button
              onClick={() => setActiveTab('payroll')}
              className="flex items-center gap-1.5 rounded-xl bg-white/10 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-all border border-white/10"
            >
              <CreditCard className="h-4 w-4" />
              View Salary
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Attendance Check-In / Check-Out Widget & Stat Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Live Attendance Tracker Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Daily Attendance Clock
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                isCheckedIn
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isCheckedIn ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`}></span>
              {isCheckedIn ? 'CLOCKED IN' : 'NOT CLOCKED IN'}
            </span>
          </div>

          <div className="mt-4 text-center">
            <div className="text-4xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
              {formatTimer(secondsWorked)}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {todayAttendance?.checkIn
                ? `Check-in: ${todayAttendance.checkIn}`
                : 'Not checked in today'}
            </p>
          </div>

          <button
            onClick={handleToggleCheckIn}
            className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-white shadow-lg transition-all ${
              isCheckedIn
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
            }`}
          >
            {isCheckedIn ? (
              <>
                <Square className="h-4 w-4 fill-white" />
                Clock Out
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" />
                Clock In Now
              </>
            )}
          </button>
        </div>

        {/* Quick Stat Tiles Grid */}
        <div className="grid grid-cols-2 gap-4 md:col-span-2">
          {/* Card 1: Leave Balance */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold">Paid Leave Balance</span>
              <CalendarDays className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              14 Days
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full w-3/4 rounded-full bg-indigo-600"></div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              7 Sick • 3 Unpaid remaining
            </p>
          </div>

          {/* Card 2: Attendance Score */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold">Attendance Punctuality</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              98.4%
            </div>
            <p className="mt-1 text-xs text-emerald-600 font-semibold dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              On-time streak: 12 days
            </p>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Target: &gt; 95% threshold
            </p>
          </div>

          {/* Card 3: Next Salary Payout */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold">Next Payout Date</span>
              <CreditCard className="h-4 w-4 text-violet-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              Sept 01
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Estimated Net: <span className="font-semibold text-slate-800 dark:text-slate-200">$88,000</span>
            </p>
          </div>

          {/* Card 4: Recent Leave Status */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold">Latest Request</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
              {myLeaves.length > 0 ? myLeaves[0].leaveType + ' Leave' : 'No recent requests'}
            </div>
            {myLeaves.length > 0 ? (
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                    myLeaves[0].status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-700'
                      : myLeaves[0].status === 'Pending'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {myLeaves[0].status}
                </span>
                <span className="text-[11px] text-slate-500">{myLeaves[0].totalDays} Days</span>
              </div>
            ) : (
              <p className="mt-1 text-xs text-slate-400">Apply anytime in Leave module</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity & Quick Action Row */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Recent Workday Logs & Alerts
          </h3>
          <button
            onClick={() => setActiveTab('attendance')}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            View All Logs
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Checked in at 09:00 AM
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Recorded via Web App • IP Verified
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Today</span>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Salary Credit - August 2026
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Net $88,000 processed to Direct Deposit
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Aug 01</span>
          </div>
        </div>
      </div>
    </div>
  );
};
