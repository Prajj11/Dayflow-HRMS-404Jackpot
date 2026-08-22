import React, { useState } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import {
  Bell,
  UserCheck,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  Info,
  LogOut,
  ChevronDown
} from 'lucide-react';

export const Navbar: React.FC<{ onOpenAuth: () => void }> = ({ onOpenAuth }) => {
  const { currentUser, activeRole, switchRole, toast } = useHRMS();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85">
      {/* Toast Alert Banner */}
      {toast && (
        <div
          className={`flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold text-white animate-in slide-in-from-top duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-600'
              : toast.type === 'error'
              ? 'bg-rose-600'
              : 'bg-indigo-600'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
          {toast.type === 'error' && <AlertCircle className="h-4 w-4" />}
          {toast.type === 'info' && <Info className="h-4 w-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Dayflow
              </span>
              <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                HRMS
              </span>
            </div>
            <p className="hidden text-[11px] font-medium text-slate-500 sm:block dark:text-slate-400">
              Every workday, perfectly aligned.
            </p>
          </div>
        </div>

        {/* Right Actions: Quick Role Switcher + Notifications + Profile */}
        <div className="flex items-center gap-3">
          {/* Quick Role Switcher */}
          <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => switchRole('employee')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                activeRole === 'employee'
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Employee View
            </button>
            <button
              onClick={() => switchRole('hr')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                activeRole === 'hr'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              HR Admin
            </button>
          </div>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Notifications
                  </h4>
                  <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    3 New
                  </span>
                </div>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/50">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Leave Request Update
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      Alex Rivera's 3-day leave request is pending approval.
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/50">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Payslip Generated
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      August 2026 salary slip is now available for download.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile / Auth Action */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="h-8 w-8 rounded-full border border-slate-200 object-cover dark:border-slate-700"
              />
              <div className="hidden text-left sm:block">
                <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                  {currentUser.name}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {currentUser.role === 'hr' ? 'HR Manager' : currentUser.position}
                </p>
              </div>
              <button
                onClick={onOpenAuth}
                title="Switch User / Re-login"
                className="ml-1 rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
