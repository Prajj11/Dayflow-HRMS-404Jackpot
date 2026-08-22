import { createFileRoute } from '@tanstack/react-router';
import React, { useState } from 'react';
import { HRMSProvider, useHRMS } from '../context/HRMSContext';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { EmployeeDashboard } from '../components/Dashboard/EmployeeDashboard';
import { AdminDashboard } from '../components/Dashboard/AdminDashboard';
import { ProfileView } from '../components/Profile/ProfileView';
import { AttendanceModule } from '../components/Attendance/AttendanceModule';
import { LeaveModule } from '../components/Leave/LeaveModule';
import { PayrollModule } from '../components/Payroll/PayrollModule';
import { AnalyticsModule } from '../components/Analytics/AnalyticsModule';
import { AuthModal } from '../components/Auth/AuthModal';

export const Route = createFileRoute('/')({
  component: DayflowAppWrapper,
});

function DayflowAppWrapper() {
  return (
    <HRMSProvider>
      <MainHRMSApp />
    </HRMSProvider>
  );
}

function MainHRMSApp() {
  const { activeTab, activeRole } = useHRMS();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const renderActiveModule = () => {
    switch (activeTab) {
      case 'dashboard':
        return activeRole === 'hr' ? <AdminDashboard /> : <EmployeeDashboard />;
      case 'profiles':
        return <ProfileView />;
      case 'attendance':
        return <AttendanceModule />;
      case 'leaves':
        return <LeaveModule />;
      case 'payroll':
        return <PayrollModule />;
      case 'analytics':
        return <AnalyticsModule />;
      default:
        return activeRole === 'hr' ? <AdminDashboard /> : <EmployeeDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans dark:bg-slate-950 dark:text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <Navbar onOpenAuth={() => setIsAuthOpen(true)} />

      {/* Main Body with Sidebar + Content Area */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col md:flex-row">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Dynamic Workspace Panel */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {renderActiveModule()}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <p>
          Dayflow HRMS • Odoo x NMIT Hackathon Edition • Built with React.js & Tailwind CSS
        </p>
      </footer>

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}
