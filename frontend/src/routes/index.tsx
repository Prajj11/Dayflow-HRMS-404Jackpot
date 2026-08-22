import { createFileRoute } from '@tanstack/react-router';
import React, { useState } from 'react';
import { HRMSProvider, useHRMS } from '../context/HRMSContext';
import { EmployeeDashboard } from '../components/Dashboard/EmployeeDashboard';
import { ProfileView } from '../components/Profile/ProfileView';
import { AttendanceModule } from '../components/Attendance/AttendanceModule';
import { LeaveModule } from '../components/Leave/LeaveModule';
import { PayrollModule } from '../components/Payroll/PayrollModule';
import { AuthModal } from '../components/Auth/AuthModal';
import { ArrowLeft } from 'lucide-react';

export const Route = createFileRoute('/')({
  component: DayflowAppWrapper,
});

function DayflowAppWrapper() {
  return (
    <HRMSProvider>
      <MainEmployeeApp />
    </HRMSProvider>
  );
}

function MainEmployeeApp() {
  const { activeTab, setActiveTab } = useHRMS();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  if (activeTab === 'dashboard') {
    return (
      <>
        <EmployeeDashboard onLogout={() => setIsAuthOpen(true)} />
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      </>
    );
  }

  const renderActiveModule = () => {
    switch (activeTab) {
      case 'profiles':
        return <ProfileView />;
      case 'attendance':
        return <AttendanceModule />;
      case 'leaves':
        return <LeaveModule />;
      case 'payroll':
        return <PayrollModule />;
      default:
        return <EmployeeDashboard onLogout={() => setIsAuthOpen(true)} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans dark:bg-[#090D16] dark:text-slate-100 flex flex-col">
      {/* Sub-Page Top Header Bar */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-6 py-4 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
          <div className="text-xs font-extrabold uppercase tracking-wider text-[#714B67] dark:text-[#8E587E]">
            Dayflow Employee Portal
          </div>
        </div>
      </header>

      {/* Module Content */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {renderActiveModule()}
      </main>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}
