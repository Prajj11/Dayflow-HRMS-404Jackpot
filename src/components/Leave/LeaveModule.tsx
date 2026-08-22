import React, { useState } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { HRMSStorage } from '../../services/hrmsStorage';
import { LeaveType, LeaveStatus } from '../../types/hrms';
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  X,
  AlertCircle,
  ShieldCheck,
  Send
} from 'lucide-react';

export const LeaveModule: React.FC = () => {
  const { leaves, activeRole, currentUser, refreshData, showToast } = useHRMS();
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  // Form State
  const [leaveType, setLeaveType] = useState<LeaveType>('Paid');
  const [startDate, setStartDate] = useState('2026-08-25');
  const [endDate, setEndDate] = useState('2026-08-27');
  const [reason, setReason] = useState('');

  // Comment input for HR approvals
  const [hrComments, setHrComments] = useState<{ [key: string]: string }>({});

  const isHR = activeRole === 'hr';

  // Apply Leave Handler
  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    HRMSStorage.submitLeaveRequest({
      employeeId: currentUser.employeeId,
      employeeName: currentUser.name,
      leaveType,
      startDate,
      endDate,
      totalDays: diffDays,
      reason: reason || 'Personal time off request.'
    });

    refreshData();
    setIsApplyModalOpen(false);
    showToast(`Leave request submitted for ${diffDays} day(s)!`, 'success');
  };

  // HR Approval / Rejection
  const handleApprove = (id: string) => {
    const comment = hrComments[id] || 'Approved by HR.';
    HRMSStorage.updateLeaveStatus(id, 'Approved', comment);
    refreshData();
    showToast('Leave request APPROVED.', 'success');
  };

  const handleReject = (id: string) => {
    const comment = hrComments[id] || 'Rejected by HR.';
    HRMSStorage.updateLeaveStatus(id, 'Rejected', comment);
    refreshData();
    showToast('Leave request REJECTED.', 'info');
  };

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <Clock className="h-3 w-3" />
            Pending Review
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-extrabold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
            <XCircle className="h-3 w-3" />
            Rejected
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
            <CalendarDays className="h-4 w-4" />
            Leave & Time-Off Management
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {isHR ? 'HR Leave Approvals & Management' : 'Apply & Track Leave Requests'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isHR
              ? 'Review pending time-off applications, approve/reject with feedback, and maintain company leave records.'
              : 'Submit new time-off applications (Paid, Sick, Unpaid) and track approval progress.'}
          </p>
        </div>

        {!isHR && (
          <button
            onClick={() => setIsApplyModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-all"
          >
            <Plus className="h-4 w-4" />
            Apply for Leave
          </button>
        )}
      </div>

      {/* Leave Balance Overview for Employee */}
      {!isHR && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="text-[10px] font-bold uppercase text-slate-400">Paid Leave</span>
            <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
              14 Days
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Available balance</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="text-[10px] font-bold uppercase text-slate-400">Sick Leave</span>
            <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
              7 Days
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Available balance</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="text-[10px] font-bold uppercase text-slate-400">Unpaid Leave</span>
            <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
              3 Days
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Available balance</p>
          </div>
        </div>
      )}

      {/* Leave Requests Table / List */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {isHR ? 'Company-Wide Leave Requests Queue' : 'My Submitted Leave Applications'}
          </h3>
          <span className="text-xs font-semibold text-slate-500">
            Total Requests: {leaves.length}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {leaves.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">No leave requests found.</p>
          ) : (
            leaves.map(req => (
              <div
                key={req.id}
                className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                      {req.employeeName}
                    </span>
                    <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {req.leaveType} Leave
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      ({req.employeeId})
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-semibold">Dates:</span> {req.startDate} → {req.endDate} ({req.totalDays} Days)
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                    Reason: "{req.reason}"
                  </p>
                  {req.hrComment && (
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      HR Feedback: {req.hrComment}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(req.status)}

                  {isHR && req.status === 'Pending' && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        placeholder="HR comment..."
                        value={hrComments[req.id] || ''}
                        onChange={e =>
                          setHrComments({ ...hrComments, [req.id]: e.target.value })
                        }
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleApprove(req.id)}
                          className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-500"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold text-white hover:bg-rose-500"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Apply Leave Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Apply for Time-Off / Leave
              </h3>
              <button
                onClick={() => setIsApplyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Leave Category
                </label>
                <select
                  value={leaveType}
                  onChange={e => setLeaveType(e.target.value as LeaveType)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="Paid">Paid Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Unpaid">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Reason / Remarks
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide reason for leave application..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="mt-5 flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500"
                >
                  <Send className="h-4 w-4" />
                  Submit Request
                </button>
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
