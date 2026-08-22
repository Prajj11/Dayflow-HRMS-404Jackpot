import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, EmployeeProfile, AttendanceRecord, LeaveRequest, PayrollRecord, UserRole } from '../types/hrms';
import { HRMSStorage } from '../services/hrmsStorage';

interface HRMSContextType {
  currentUser: User | null;
  activeRole: UserRole;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  switchRole: (role: UserRole) => void;
  employees: EmployeeProfile[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  payroll: PayrollRecord[];
  refreshData: () => void;
  selectedEmployeeId: string;
  setSelectedEmployeeId: (id: string) => void;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const HRMSContext = createContext<HRMSContextType | undefined>(undefined);

export const HRMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>('hr');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('DF-1002');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const refreshData = () => {
    const user = HRMSStorage.getCurrentUser();
    setCurrentUser(user);
    if (user) {
      setActiveRole(user.role);
    }
    setEmployees(HRMSStorage.getEmployees());
    setAttendance(HRMSStorage.getAttendanceRecords());
    setLeaves(HRMSStorage.getLeaveRequests());
    setPayroll(HRMSStorage.getPayrollRecords());
  };

  useEffect(() => {
    HRMSStorage.init();
    refreshData();
  }, []);

  const handleSwitchRole = (role: UserRole) => {
    const user = HRMSStorage.switchRole(role);
    setCurrentUser(user);
    setActiveRole(role);
    refreshData();
    showToast(`Switched view to ${role.toUpperCase()} mode!`, 'info');
  };

  return (
    <HRMSContext.Provider
      value={{
        currentUser,
        activeRole,
        activeTab,
        setActiveTab,
        switchRole: handleSwitchRole,
        employees,
        attendance,
        leaves,
        payroll,
        refreshData,
        selectedEmployeeId,
        setSelectedEmployeeId,
        toast,
        showToast
      }}
    >
      {children}
    </HRMSContext.Provider>
  );
};

export const useHRMS = () => {
  const context = useContext(HRMSContext);
  if (!context) {
    throw new Error('useHRMS must be used within an HRMSProvider');
  }
  return context;
};
