import React from 'react';
import { useHRMS } from '../../context/HRMSContext';
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  CreditCard,
  BarChart3,
  CheckCircle2,
  FileText
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, activeRole, leaves } = useHRMS();

  const pendingLeavesCount = leaves.filter(l => l.status === 'Pending').length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profiles', label: 'Employee Profiles', icon: Users },
    { id: 'attendance', label: 'Attendance & Logs', icon: Clock },
    {
      id: 'leaves',
      label: 'Leave & Time-Off',
      icon: CalendarDays,
      badge: pendingLeavesCount > 0 ? pendingLeavesCount : undefined
    },
    { id: 'payroll', label: 'Payroll & Payslips', icon: CreditCard },
    { id: 'analytics', label: 'HR Analytics', icon: BarChart3 }
  ];

  return (
    <aside className="w-full md:w-64 shrink-0 border-r border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mb-4 px-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Navigation ({activeRole === 'hr' ? 'HR Portal' : 'Employee View'})
        </p>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 dark:bg-indigo-600'
                  : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`h-4 w-4 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-200'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    isActive
                      ? 'bg-white text-indigo-700'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick Info Box */}
      <div className="mt-8 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 dark:border-indigo-900/50 dark:bg-indigo-950/30">
        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="text-xs font-bold">System Status</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
          Dayflow HRMS v2.4 core features fully synced.
        </p>
      </div>
    </aside>
  );
};
