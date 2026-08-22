import React, { useState } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import {
  Bell,
  UserCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  Info,
  LogOut,
  ChevronDown,
  User
} from 'lucide-react';

export const Navbar: React.FC<{ onOpenAuth: () => void }> = ({ onOpenAuth }) => {
  const { currentUser, toast } = useHRMS();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
      {/* Toast Alert Banner */}
      {toast && (
        <div
          className={`flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold text-white animate-in slide-in-from-top duration-300 ${
            toast.type === 'success'
              ? 'bg-[#10B981]'
              : toast.type === 'error'
              ? 'bg-rose-600'
              : 'bg-[#714B67]'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
          {toast.type === 'error' && <AlertCircle className="h-4 w-4" />}
          {toast.type === 'info' && <Info className="h-4 w-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo & Odoo Employee Portal Badge */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#714B67] to-[#4C2D43] text-white shadow-md shadow-[#714B67]/20">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans">
                Dayflow
              </span>
              <span className="rounded-full bg-[#f5edf3] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#714B67] dark:bg-slate-800 dark:text-[#8E587E] border border-[#714B67]/20">
                Employee Portal
              </span>
            </div>
            <p className="hidden text-[11px] font-medium text-slate-500 sm:block dark:text-slate-400">
              Every workday, perfectly aligned.
            </p>
          </div>
        </div>

        {/* Right Actions: Notifications + Active Employee Profile Badge */}
        <div className="flex items-center gap-3">
          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00A09D] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00A09D]"></span>
              </span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    My Workday Alerts
                  </h4>
                  <span className="rounded-full bg-[#f5edf3] px-2 py-0.5 text-[10px] font-bold text-[#714B67]">
                    2 New
                  </span>
                </div>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Attendance Clock Reminder
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      Shift clock active since 09:00 AM.
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Salary Slip Available
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      August 2026 payslip is ready for download in Salary module.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Employee User Badge */}
          {currentUser ? (
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="h-9 w-9 rounded-xl border border-[#714B67]/30 object-cover"
              />
              <div className="hidden text-left sm:block">
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  {currentUser.name}
                </p>
                <p className="text-[10px] text-[#714B67] dark:text-[#8E587E] font-semibold">
                  {currentUser.position}
                </p>
              </div>
              <button
                onClick={onOpenAuth}
                title="Switch User / Account"
                className="ml-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="rounded-xl bg-[#714B67] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#5C3E54]"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
