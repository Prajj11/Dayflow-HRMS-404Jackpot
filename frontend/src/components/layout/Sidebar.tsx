import React from 'react';
import { useHRMS } from '../../context/HRMSContext';
import {
  LayoutDashboard,
  User,
  Clock,
  CalendarDays,
  CreditCard,
  CheckCircle2
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab } = useHRMS();

  const navItems = [
    { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { id: 'profiles', label: 'My Profile', icon: User },
    { id: 'attendance', label: 'My Attendance', icon: Clock },
    { id: 'leaves', label: 'My Leave Requests', icon: CalendarDays },
    { id: 'payroll', label: 'My Salary & Payslip', icon: CreditCard }
  ];

  return (
    <aside className="w-full md:w-64 shrink-0 border-r border-slate-200/80 bg-white/50 p-4 dark:border-slate-800 dark:bg-slate-900/50 font-sans">
      <div className="mb-4 px-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#714B67] dark:text-[#8E587E]">
          Employee Navigation
        </p>
      </div>

      <nav className="space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all ${
                isActive
                  ? 'bg-[#714B67] text-white shadow-md shadow-[#714B67]/20'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`h-4 w-4 transition-colors ${
                    isActive ? 'text-[#00A09D]' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-200'
                  }`}
                />
                <span>{item.label}</span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* System Status Card */}
      <div className="mt-8 rounded-2xl border border-emerald-200/60 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#10B981]" />
          <span className="text-xs font-bold">Shift Active</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
          Dayflow Employee Portal ready for check-in & time tracking.
        </p>
      </div>
    </aside>
  );
};
