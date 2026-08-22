import React, { useState, useEffect } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { HRMSStorage } from '../../services/hrmsStorage';
import { AttendanceModule } from '../Attendance/AttendanceModule';
import { LeaveModule } from '../Leave/LeaveModule';
import { PayrollModule } from '../Payroll/PayrollModule';
import {
  Building2,
  Clock,
  CalendarDays,
  CreditCard,
  User,
  TrendingUp,
  Play,
  Square,
  IndianRupee,
  BadgeCheck,
  XCircle,
  CalendarCheck,
  BarChart3,
  LogOut,
  ChevronRight,
  UserCheck,
  Sparkles,
  Briefcase,
  Mail,
  Shield,
  Calendar,
  FileText,
  Plus,
  Bell,
  ChevronDown,
  Edit,
  Save,
  Phone,
  MapPin
} from 'lucide-react';

export const EmployeeDashboard: React.FC = () => {
  const { currentUser, employees, selectedEmployeeId, leaves, attendance, showToast, refreshData } = useHRMS();
  const [activeRoleView, setActiveRoleView] = useState<'hr' | 'employee'>('employee');
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'attendance' | 'leaves' | 'payroll'>('overview');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);

  // Match active user profile or default
  const activeEmployeeId = currentUser?.employeeId || selectedEmployeeId || 'DF-8620';
  const employeeProfile = employees.find(e => e.employeeId === activeEmployeeId || e.id === activeEmployeeId) || {
    id: 'usr-8620',
    employeeId: 'DF-8620',
    name: currentUser?.name || 'Marryjane',
    position: currentUser?.position || 'Software Engineer',
    department: currentUser?.department || 'Engineering',
    email: currentUser?.email || 'marryjane@dayflow.com',
    phone: '+1 (555) 123-4567',
    address: 'San Francisco, CA',
    joiningDate: '2026-08-22',
    status: 'Active'
  };

  const activeName = activeRoleView === 'hr' ? 'Sarah Jenkins' : employeeProfile.name;
  const activePosition = activeRoleView === 'hr' ? 'HR Director' : employeeProfile.position;
  const activeInitials = activeRoleView === 'hr' ? 'HR' : activeName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  // Contact Info edit state
  const [phoneInput, setPhoneInput] = useState(employeeProfile.phone || '+1 (555) 123-4567');
  const [addressInput, setAddressInput] = useState(employeeProfile.address || 'San Francisco, CA');

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    HRMSStorage.updateEmployeeProfile(employeeProfile.id || employeeProfile.employeeId, {
      phone: phoneInput,
      address: addressInput
    });
    refreshData();
    setIsEditingContact(false);
    showToast(`Contact information updated for ${activeName}!`, 'success');
  };

  const [todayAttendance, setTodayAttendance] = useState(
    HRMSStorage.getTodayAttendance(employeeProfile.employeeId)
  );
  const [isCheckedIn, setIsCheckedIn] = useState(!!todayAttendance?.checkIn && !todayAttendance?.checkOut);
  const [secondsWorked, setSecondsWorked] = useState(15034); // ~4 hours
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
    const updated = HRMSStorage.checkIn(employeeProfile.employeeId);
    setTodayAttendance(updated);
    setIsCheckedIn(!isCheckedIn);
    setIsOnBreak(false);
    showToast(isCheckedIn ? 'Checked out successfully.' : 'Checked in successfully! Shift timer active.', isCheckedIn ? 'info' : 'success');
    refreshData();
  };

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const myLeaves = leaves.filter(
    l => l.employeeId === employeeProfile.employeeId || l.employeeName === employeeProfile.name
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans dark:bg-[#090D16] dark:text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-6 py-3 dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* Left Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#714B67] to-[#4C2D43] text-white shadow-md shadow-[#714B67]/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold font-sans tracking-tight text-slate-900 dark:text-white">
                  Dayflow
                </span>
                <span className="rounded-full bg-[#f5edf3] px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.06em] text-[#714B67] dark:bg-slate-800 dark:text-[#8E587E] border border-[#714B67]/20">
                  HRMS Enterprise
                </span>
              </div>
              <p className="font-display text-sm text-[#714B67] dark:text-[#8E587E]">
                Every workday, aligned.
              </p>
            </div>
          </div>

          {/* Right Header Navigation & Actions */}
          <div className="flex items-center gap-4">
            {/* Role Switcher Container */}
            <div className="flex items-center gap-1 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-1 dark:border-slate-800 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setActiveRoleView('hr');
                  showToast('Switched view to HR Admin Mode', 'info');
                }}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.06em] transition-all ${
                  activeRoleView === 'hr'
                    ? 'bg-[#714B67] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                HR Admin
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveRoleView('employee');
                  showToast('Switched view to Employee Portal', 'info');
                }}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.06em] transition-all ${
                  activeRoleView === 'employee'
                    ? 'bg-[#714B67] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <User className="h-3.5 w-3.5" />
                Employee Portal
              </button>
            </div>

            {/* Notification Bell Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition-all"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-600 font-mono text-[11px] font-bold text-white shadow-xs">
                  3
                </span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-[0.06em]">
                      Workday Notifications
                    </h4>
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                      3 Pending
                    </span>
                  </div>
                  <div className="mt-3 space-y-2 text-[15px] leading-relaxed">
                    <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">Shift Clock Active</p>
                      <p className="text-xs text-slate-500 mt-0.5">Shift timer running for 4+ hours.</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">August Payslip Generated</p>
                      <p className="text-xs text-slate-500 mt-0.5 font-mono">₹1,52,000 net payout verified.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Top Right Profile Badge Button with Dropdown Panel for Edit Contact Info */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-1.5 shadow-2xs hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5edf3] font-mono text-[13px] font-bold text-[#714B67] border border-[#714B67]/20 shadow-2xs dark:bg-slate-800 dark:text-[#8E587E]">
                  {activeInitials}
                </div>
                <div className="text-left leading-tight">
                  <p className="text-xs font-bold text-slate-900 dark:text-white font-sans flex items-center gap-1">
                    {activeName}
                    <ChevronDown className="h-3 w-3 text-slate-400" />
                  </p>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {activePosition}
                  </p>
                </div>
              </button>

              {/* Profile Dropdown Panel containing Contact Details & Edit Form */}
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-96 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-50 animate-in fade-in zoom-in-95 duration-200">
                  {/* Profile Header */}
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5edf3] text-[#714B67] dark:bg-slate-800 dark:text-[#8E587E] border border-[#714B67]/30">
                      <User className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white font-sans">
                          {activeName}
                        </h4>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          Active
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[#714B67] dark:text-[#8E587E]">
                        {activePosition} • {employeeProfile.department || 'Engineering'}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        ID: {employeeProfile.employeeId} | Joined: {employeeProfile.joiningDate || '2026-08-22'}
                      </p>
                    </div>
                  </div>

                  {/* Contact Info View vs Edit Form */}
                  {!isEditingContact ? (
                    <div className="mt-4 space-y-3">
                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                        <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-slate-400 block">
                          WORK EMAIL
                        </span>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-[#714B67]" />
                          {employeeProfile.email || `${activeName.toLowerCase().replace(' ', '')}@dayflow.com`}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                        <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-slate-400 block">
                          PHONE NUMBER
                        </span>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1.5 font-mono">
                          <Phone className="h-3.5 w-3.5 text-[#714B67]" />
                          {phoneInput}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                        <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-slate-400 block">
                          RESIDENTIAL ADDRESS
                        </span>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-[#714B67]" />
                          {addressInput}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsEditingContact(true)}
                        className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-[#714B67] px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#5C3E54] transition-all"
                      >
                        <Edit className="h-4 w-4" />
                        Edit Contact Info
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveContact} className="mt-4 space-y-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500 block">
                          Phone Number
                        </label>
                        <input
                          type="text"
                          required
                          value={phoneInput}
                          onChange={e => setPhoneInput(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono font-semibold focus:border-[#714B67] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500 block">
                          Residential Address
                        </label>
                        <input
                          type="text"
                          required
                          value={addressInput}
                          onChange={e => setAddressInput(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold focus:border-[#714B67] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="submit"
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#714B67] py-2 text-xs font-bold text-white hover:bg-[#5C3E54] shadow-sm"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Save Changes
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingContact(false)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Logout Button */}
            <button
              onClick={() => { window.location.href = '/login'; }}
              title="Logout"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white transition-all"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8 space-y-6">
        {/* Workspace Title Header with Display Caveat font tagline */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.06em] text-[#714B67] dark:text-[#8E587E]">
              <User className="h-3.5 w-3.5 text-[#00A09D]" />
              {activeRoleView === 'hr' ? 'HR ADMIN WORKSPACE' : 'EMPLOYEE SELF-SERVICE WORKSPACE'}
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {activeRoleView === 'hr' ? 'HR Management & Operations Portal' : 'Leave & Time-Off Management'}
              </h1>
              <span className="font-display text-2xl text-[#714B67] dark:text-[#8E587E] hidden sm:inline">
                Every workday, aligned.
              </span>
            </div>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
              Employees can select a leave type, choose a date range, and add remarks. Requests move through Pending, Approved, or Rejected states.
            </p>
          </div>

          {/* Quick Clock In / Out Action Button */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-right">
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-400 block">
                SHIFT TIMER
              </span>
              <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                {formatTimer(secondsWorked)}
              </span>
            </div>
            <button
              onClick={handleToggleCheckIn}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-white shadow-md transition-all ${
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

        {/* 4 KPI Metrics Summary Row */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">TODAY'S SHIFT</span>
              <Clock className="h-4 w-4 text-[#714B67]" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                {formatTimer(secondsWorked)}
              </span>
            </div>
            <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              {isCheckedIn ? 'Currently Clocked In' : 'Off Shift'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">PUNCTUALITY SCORE</span>
              <TrendingUp className="h-4 w-4 text-[#00A09D]" />
            </div>
            <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white font-mono">
              98.4%
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full w-[98%] rounded-full bg-[#00A09D]"></div>
            </div>
            <p className="mt-2 text-xs font-normal text-slate-500 dark:text-slate-400">
              On-time streak: <span className="font-mono">12</span> Workdays
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">LEAVE BALANCE</span>
              <CalendarDays className="h-4 w-4 text-[#714B67]" />
            </div>
            <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white font-mono">
              14 Days
            </div>
            <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              7 Sick • 3 Casual Available
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">NET MONTHLY PAYOUT</span>
              <IndianRupee className="h-4 w-4 text-[#00A09D]" />
            </div>
            <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white font-mono">
              ₹1,52,000
            </div>
            <p className="mt-2 text-xs font-normal text-slate-500 dark:text-slate-400">
              Disbursement: <span className="font-mono text-xs">2026-09-01</span>
            </p>
          </div>
        </div>

        {/* Workspace Navigation Tabs (My Profile Details removed from center) */}
        <div className="border-b border-slate-200/80 pb-px dark:border-slate-800">
          <nav className="flex space-x-6 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveSubTab('overview')}
              className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold uppercase tracking-[0.06em] transition-all whitespace-nowrap ${
                activeSubTab === 'overview'
                  ? 'border-[#714B67] text-[#714B67] dark:border-[#8E587E] dark:text-[#8E587E]'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Overview & Analytics
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('attendance')}
              className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold uppercase tracking-[0.06em] transition-all whitespace-nowrap ${
                activeSubTab === 'attendance'
                  ? 'border-[#714B67] text-[#714B67] dark:border-[#8E587E] dark:text-[#8E587E]'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Clock className="h-4 w-4" />
              Attendance Matrix
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('leaves')}
              className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold uppercase tracking-[0.06em] transition-all whitespace-nowrap ${
                activeSubTab === 'leaves'
                  ? 'border-[#714B67] text-[#714B67] dark:border-[#8E587E] dark:text-[#8E587E]'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <CalendarDays className="h-4 w-4" />
              Leave Requests ({myLeaves.filter(l => l.status === 'Pending').length})
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('payroll')}
              className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold uppercase tracking-[0.06em] transition-all whitespace-nowrap ${
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

        {/* Dynamic In-Place View Toggle Container */}
        {activeSubTab === 'overview' && (
          <div className="grid gap-6 md:grid-cols-3 animate-in fade-in duration-200">
            {/* Main 2-Column Workday Attendance Matrix */}
            <div className="md:col-span-2 space-y-6">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[#121826] dark:text-white font-sans">
                      Weekly Attendance Matrix
                    </h3>
                    <p className="text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
                      Daily check-in, check-out and total shift hours logged
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveSubTab('attendance')}
                    className="text-xs font-semibold uppercase tracking-[0.06em] text-[#714B67] hover:underline"
                  >
                    View Full Matrix →
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
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5edf3] text-[#714B67] font-bold text-xs font-mono">
                          {item.day.slice(0, 3)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white font-sans">
                            {item.day}
                          </p>
                          <p className="text-[13px] text-slate-500 dark:text-slate-400 font-mono">
                            Check-In: <span>{item.checkIn}</span> • Out: <span>{item.checkOut}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.06em] text-emerald-700 border border-emerald-200 block">
                          {item.status}
                        </span>
                        <span className="text-[13px] font-mono text-slate-500 mt-1 block">
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
                  <h3 className="text-lg font-semibold text-[#121826] dark:text-white font-sans">
                    My Salary Breakdown & Payslips
                  </h3>
                  <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[#00A09D]">
                    STATUS: VERIFIED
                  </span>
                </div>

                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-xs uppercase font-semibold tracking-[0.06em] text-slate-400 border-b border-slate-200/80 dark:bg-slate-800/50 dark:border-slate-800">
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
                        <p className="font-bold text-slate-900 dark:text-white font-sans">{employeeProfile.name}</p>
                        <p className="text-[13px] text-slate-400 font-mono">{employeeProfile.employeeId} • {employeeProfile.department}</p>
                      </td>
                      <td className="py-3 px-3 font-mono text-[13px]">₹1,20,000</td>
                      <td className="py-3 px-3 font-mono text-[13px] text-emerald-600">+₹38,000</td>
                      <td className="py-3 px-3 font-mono text-[13px] text-rose-600">-₹6,000</td>
                      <td className="py-3 px-3 font-mono text-[13px] font-bold text-[#714B67] dark:text-[#8E587E]">₹1,52,000</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setActiveSubTab('payroll')}
                          className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                        >
                          View Payslip
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column: Leave Status & Upcoming Holidays */}
            <div className="space-y-6">
              {/* Leave Status Card */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-[#714B67]" />
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-[0.06em]">
                      LEAVE STATUS
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveSubTab('leaves')}
                    className="flex items-center gap-1 rounded-lg bg-[#f5edf3] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-[#714B67] hover:bg-[#eadea7] dark:bg-slate-800 dark:text-[#8E587E] transition-all"
                  >
                    <Plus className="h-3 w-3" />
                    Apply
                  </button>
                </div>

                {myLeaves.length === 0 ? (
                  <div className="py-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 dark:bg-slate-800/60">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-[#121826] dark:text-slate-200 font-sans">
                      Apply for leave
                    </h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
                      Employees can select a leave type, choose a date range, and add remarks.
                    </p>
                    <button
                      onClick={() => setActiveSubTab('leaves')}
                      className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-[#714B67] hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-[#8E587E]"
                    >
                      Request Time Off
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {myLeaves.map(l => (
                      <div key={l.id} className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white capitalize">
                            {l.leaveType} Leave
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.06em] ${
                            l.status === 'Approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {l.status}
                          </span>
                        </div>
                        <p className="text-[13px] font-mono text-slate-500 mt-1">
                          {l.startDate} to {l.endDate} ({l.totalDays} Days)
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upcoming Holidays Mini List */}
                <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <span className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">
                    UPCOMING HOLIDAYS
                  </span>
                  <div className="mt-2 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <span className="font-medium font-sans">🇮🇳 Independence Day</span>
                      <span className="font-mono text-[13px] text-slate-500">2026-08-15</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <span className="font-medium font-sans">🚩 Labor Day</span>
                      <span className="font-mono text-[13px] text-slate-500">2026-09-01</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'attendance' && (
          <div className="animate-in fade-in duration-200">
            <AttendanceModule />
          </div>
        )}

        {activeSubTab === 'leaves' && (
          <div className="animate-in fade-in duration-200">
            <LeaveModule />
          </div>
        )}

        {activeSubTab === 'payroll' && (
          <div className="animate-in fade-in duration-200">
            <PayrollModule />
          </div>
        )}
      </main>
    </div>
  );
};
