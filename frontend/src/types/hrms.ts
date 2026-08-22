export type UserRole = 'employee' | 'hr';

export type AttendanceStatus = 'Present' | 'Absent' | 'Half-day' | 'Leave';
export type LeaveType = 'Paid' | 'Sick' | 'Unpaid';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

export interface User {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  department: string;
  position: string;
}

export interface SalaryStructure {
  basic: number;
  hra: number;
  specialAllowance: number;
  pf: number;
  tax: number;
  netSalary: number;
}

export interface EmployeeDocument {
  id: string;
  title: string;
  type: string;
  uploadDate: string;
  size: string;
}

export interface EmployeeProfile {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  avatar: string;
  department: string;
  position: string;
  joiningDate: string;
  manager: string;
  role: UserRole;
  status: 'Active' | 'On Leave' | 'Inactive';
  salary: SalaryStructure;
  documents: EmployeeDocument[];
  leaveBalance: {
    paid: number;
    sick: number;
    unpaid: number;
  };
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  checkIn: string | null; // HH:MM AM/PM
  checkOut: string | null; // HH:MM AM/PM
  totalHours: number;
  status: AttendanceStatus;
  notes?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  hrComment?: string;
  createdAt: string;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string; // e.g. "August 2026"
  basic: number;
  hra: number;
  allowances: number;
  deductions: number;
  netPay: number;
  status: 'Paid' | 'Processing' | 'Pending';
  paymentDate: string;
}

export interface HRAlert {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  timestamp: string;
}
