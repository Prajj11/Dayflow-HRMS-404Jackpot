import React, { useState } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { HRMSStorage } from '../../services/hrmsStorage';
import { UserRole } from '../../types/hrms';
import {
  X,
  Lock,
  Mail,
  UserCheck,
  ShieldCheck,
  Building2,
  CheckCircle,
  AlertCircle,
  Sparkles
} from 'lucide-react';

export const AuthModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const { refreshData, showToast } = useHRMS();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('sarah.jenkins@dayflow.com');
  const [password, setPassword] = useState('Password123!');
  const [employeeId, setEmployeeId] = useState('DF-1005');
  const [name, setName] = useState('New User');
  const [role, setRole] = useState<UserRole>('employee');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const employees = HRMSStorage.getEmployees();
    const found = employees.find(emp => emp.email.toLowerCase() === email.toLowerCase());

    if (!found) {
      setError('Invalid credentials. No employee account found with this email.');
      return;
    }

    HRMSStorage.setCurrentUser({
      id: found.id,
      employeeId: found.employeeId,
      name: found.name,
      email: found.email,
      role: found.role,
      avatar: found.avatar,
      department: found.department,
      position: found.position
    });

    refreshData();
    showToast(`Welcome back, ${found.name}! Signed in as ${found.role.toUpperCase()}.`);
    onClose();
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long with security numbers/symbols.');
      return;
    }

    // Register new employee profile
    const newEmp = {
      id: 'emp-' + Date.now(),
      employeeId: employeeId || 'DF-' + Math.floor(1000 + Math.random() * 9000),
      name: name,
      email: email,
      phone: '+1 (555) 000-1122',
      address: '100 Dayflow Way, Suite 100',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      department: role === 'hr' ? 'Human Resources' : 'Engineering',
      position: role === 'hr' ? 'HR Specialist' : 'Software Engineer',
      joiningDate: new Date().toISOString().split('T')[0],
      manager: 'Sarah Jenkins',
      role: role,
      status: 'Active' as const,
      salary: {
        basic: 60000,
        hra: 24000,
        specialAllowance: 12000,
        pf: 7200,
        tax: 8800,
        netSalary: 80000
      },
      documents: [],
      leaveBalance: { paid: 15, sick: 10, unpaid: 5 }
    };

    const employees = HRMSStorage.getEmployees();
    employees.push(newEmp);
    localStorage.setItem('dayflow_employees', JSON.stringify(employees));

    HRMSStorage.setCurrentUser({
      id: newEmp.id,
      employeeId: newEmp.employeeId,
      name: newEmp.name,
      email: newEmp.email,
      role: newEmp.role,
      avatar: newEmp.avatar,
      department: newEmp.department,
      position: newEmp.position
    });

    refreshData();
    showToast(`Registration successful! Verification email sent to ${email}.`, 'success');
    onClose();
  };

  const fillDemoAccount = (demoRole: 'hr' | 'employee') => {
    if (demoRole === 'hr') {
      setEmail('sarah.jenkins@dayflow.com');
      setPassword('Password123!');
    } else {
      setEmail('alex.rivera@dayflow.com');
      setPassword('Password123!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <Building2 className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">
            {mode === 'signin' ? 'Sign In to Dayflow' : 'Create HRMS Account'}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {mode === 'signin'
              ? 'Access your profile, attendance, leaves, and payroll.'
              : 'Register your Employee or HR Officer profile.'}
          </p>
        </div>

        {/* 1-Click Hackathon Presets */}
        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-2.5 dark:border-indigo-900/50 dark:bg-indigo-950/30">
          <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider text-center">
            ⚡ Quick Demo Sign In
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => fillDemoAccount('hr')}
              className="flex-1 rounded-lg bg-white py-1.5 px-2 text-[11px] font-semibold text-indigo-700 shadow-sm border border-indigo-200 hover:bg-indigo-50 dark:bg-slate-800 dark:text-indigo-300 dark:border-indigo-800"
            >
              Sarah (HR Director)
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('employee')}
              className="flex-1 rounded-lg bg-white py-1.5 px-2 text-[11px] font-semibold text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
            >
              Alex (Dev Employee)
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mt-4 flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            onClick={() => setMode('signin')}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
              mode === 'signin'
                ? 'bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
              mode === 'signup'
                ? 'bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="mt-4 space-y-3">
          {mode === 'signup' && (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Employee ID
                </label>
                <input
                  type="text"
                  required
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                  placeholder="DF-1005"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Account Role
                </label>
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('employee')}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold ${
                      role === 'employee'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                        : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400'
                    }`}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    Employee
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('hr')}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold ${
                      role === 'hr'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                        : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400'
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    HR / Admin
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Work Email
            </label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@dayflow.com"
                className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Password
            </label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-4 w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all"
          >
            {mode === 'signin' ? 'Sign In' : 'Complete Registration'}
          </button>
        </form>
      </div>
    </div>
  );
};
