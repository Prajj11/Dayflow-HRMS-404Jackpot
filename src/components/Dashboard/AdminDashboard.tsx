import React, { useState } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { HRMSStorage } from '../../services/hrmsStorage';
import {
  Users,
  Clock,
  CalendarDays,
  CreditCard,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Search,
  ArrowRight,
  ShieldCheck,
  Building,
  TrendingUp,
  UserCheck
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { employees, attendance, leaves, setActiveTab, setSelectedEmployeeId, refreshData, showToast } = useHRMS();
  const [commentInput, setCommentInput] = useState<{ [key: string]: string }>({});
  const [searchTerm, setSearchTerm] = useState('');

  const pendingLeaves = leaves.filter(l => l.status === 'Pending');
  const presentCount = attendance.filter(a => a.status === 'Present').length;
  const totalEmployeesCount = employees.length;

  const handleApprove = (id: string) => {
    const comment = commentInput[id] || 'Approved by HR Director.';
    HRMSStorage.updateLeaveStatus(id, 'Approved', comment);
    refreshData();
    showToast('Leave request APPROVED successfully.', 'success');
  };

  const handleReject = (id: string) => {
    const comment = commentInput[id] || 'Rejected due to project timelines.';
    HRMSStorage.updateLeaveStatus(id, 'Rejected', comment);
    refreshData();
    showToast('Leave request REJECTED.', 'info');
  };

  const filteredEmployees = employees.filter(
    e => e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         e.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
         e.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* HR Command Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" />
            Admin / HR Command Center
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            HR Management Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time workforce oversight, attendance tracking, leave approvals, and employee records.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('profiles')}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-all"
          >
            <Users className="h-4 w-4" />
            Manage Directory
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Card 1: Total Employees */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Total Employees</span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
            {totalEmployeesCount}
          </div>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            100% Onboarded
          </p>
        </div>

        {/* Card 2: On Duty Today */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">On Duty Today</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
            {presentCount} / {totalEmployeesCount}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {Math.round((presentCount / (totalEmployeesCount || 1)) * 100)}% attendance rate
          </p>
        </div>

        {/* Card 3: Pending Leaves Queue */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Pending Approvals</span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
            {pendingLeaves.length}
          </div>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-semibold">
            {pendingLeaves.length > 0 ? 'Requires HR action' : 'All clear'}
          </p>
        </div>

        {/* Card 4: Monthly Payroll Cost */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Monthly Payroll Cost</span>
            <div className="rounded-lg bg-violet-50 p-2 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            $346,000
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            August 2026 Disbursed
          </p>
        </div>
      </div>

      {/* Main Section: Pending Leave Approval Queue */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Pending Leave Request Approvals
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Review employee applications, add comments, and approve or reject.
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            {pendingLeaves.length} Pending
          </span>
        </div>

        {pendingLeaves.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 opacity-80" />
            <p className="mt-2 font-semibold">No pending leave requests!</p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {pendingLeaves.map(leave => (
              <div
                key={leave.id}
                className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/40 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                      {leave.employeeName}
                    </span>
                    <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {leave.leaveType} Leave
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ID: {leave.employeeId}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-semibold">Duration:</span> {leave.startDate} to {leave.endDate} ({leave.totalDays} Days)
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                    "{leave.reason}"
                  </p>
                </div>

                {/* HR Action Controls */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Add HR comment..."
                      value={commentInput[leave.id] || ''}
                      onChange={e =>
                        setCommentInput({ ...commentInput, [leave.id]: e.target.value })
                      }
                      className="w-full sm:w-48 rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(leave.id)}
                      className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-sm"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(leave.id)}
                      className="flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500 shadow-sm"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Employee List & Switcher Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Employee Directory & Switcher
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click on any employee to inspect profile, edit details, or view attendance & payslip.
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, ID, department..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full md:w-64 rounded-lg border border-slate-200 pl-8 pr-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 dark:border-slate-800 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3">Employee ID</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Position</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={emp.avatar}
                        alt={emp.name}
                        className="h-8 w-8 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{emp.name}</p>
                        <p className="text-[10px] text-slate-400">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {emp.employeeId}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-medium">
                    {emp.department}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                    {emp.position}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        emp.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {emp.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedEmployeeId(emp.employeeId);
                        setActiveTab('profiles');
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 font-bold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300"
                    >
                      View Profile
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
