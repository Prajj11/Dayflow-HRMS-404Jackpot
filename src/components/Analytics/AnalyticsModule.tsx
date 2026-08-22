import React from 'react';
import { useHRMS } from '../../context/HRMSContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  BarChart3,
  Download,
  FileText,
  TrendingUp,
  Users,
  Calendar,
  CreditCard
} from 'lucide-react';

export const AnalyticsModule: React.FC = () => {
  const { employees, showToast } = useHRMS();

  // Chart Data 1: Monthly Attendance Rate
  const attendanceData = [
    { month: 'Mar', rate: 94.2 },
    { month: 'Apr', rate: 96.5 },
    { month: 'May', rate: 95.8 },
    { month: 'Jun', rate: 97.1 },
    { month: 'Jul', rate: 98.4 },
    { month: 'Aug', rate: 98.9 }
  ];

  // Chart Data 2: Leave Categories Distribution
  const leaveData = [
    { name: 'Paid Leave', value: 45, color: '#6366f1' },
    { name: 'Sick Leave', value: 30, color: '#10b981' },
    { name: 'Unpaid Leave', value: 15, color: '#f59e0b' },
    { name: 'Casual / Other', value: 10, color: '#ec4899' }
  ];

  // Chart Data 3: Departmental Payroll Expense
  const payrollData = [
    { dept: 'Engineering', expense: 160000 },
    { dept: 'Human Resources', expense: 100000 },
    { dept: 'Product & Design', expense: 84000 },
    { dept: 'QA & Testing', expense: 74000 }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            <BarChart3 className="h-4 w-4" />
            Analytics & Reports Command Center
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            HR Performance Insights & Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Visual graphs for attendance punctuality, leave category breakdown, and payroll budget trends.
          </p>
        </div>

        <button
          onClick={() => showToast('Exported company HR report (PDF & CSV)!', 'success')}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-500"
        >
          <Download className="h-4 w-4" />
          Export All HR Reports (CSV/PDF)
        </button>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Chart 1: Monthly Attendance Rate Trend */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Monthly Attendance Rate Trend (%)
              </h3>
              <p className="text-[11px] text-slate-500">6-Month historical punctuality index</p>
            </div>
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              +4.7%
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[90, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="rate" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Leave Distribution Pie Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Leave Request Category Breakdown
            </h3>
            <p className="text-[11px] text-slate-500">Distribution across leave types</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leaveData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {leaveData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs">
            {leaveData.map(item => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="font-semibold text-slate-700 dark:text-slate-300">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 3: Departmental Payroll Budget */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:col-span-2">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Departmental Payroll Allocation ($ USD)
            </h3>
            <p className="text-[11px] text-slate-500">Monthly compensation expense by team</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payrollData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="dept" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Payroll Expense']} />
                <Bar dataKey="expense" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
