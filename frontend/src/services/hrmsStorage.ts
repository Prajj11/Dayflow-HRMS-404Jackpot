import {
  EmployeeProfile,
  AttendanceRecord,
  LeaveRequest,
  PayrollRecord,
  HRAlert,
  User
} from '../types/hrms';

const STORAGE_KEYS = {
  EMPLOYEES: 'dayflow_employees',
  ATTENDANCE: 'dayflow_attendance',
  LEAVES: 'dayflow_leaves',
  PAYROLL: 'dayflow_payroll',
  CURRENT_USER: 'dayflow_current_user',
  ALERTS: 'dayflow_alerts',
  CHECKIN_STATE: 'dayflow_checkin_state'
};

// Seed Data Initialization
const INITIAL_EMPLOYEES: EmployeeProfile[] = [
  {
    id: 'emp-1',
    employeeId: 'DF-1001',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@dayflow.com',
    phone: '+1 (555) 234-5678',
    address: '742 Evergreen Terrace, San Francisco, CA',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    department: 'Human Resources',
    position: 'HR Director / Admin',
    joiningDate: '2022-03-15',
    manager: 'CEO Office',
    role: 'hr',
    status: 'Active',
    salary: {
      basic: 75000,
      hra: 30000,
      specialAllowance: 15000,
      pf: 9000,
      tax: 11000,
      netSalary: 100000
    },
    documents: [
      { id: 'doc-1', title: 'Employment Contract.pdf', type: 'PDF', uploadDate: '2022-03-15', size: '2.4 MB' },
      { id: 'doc-2', title: 'Identity Verification.pdf', type: 'PDF', uploadDate: '2022-03-15', size: '1.1 MB' }
    ],
    leaveBalance: { paid: 18, sick: 10, unpaid: 5 }
  },
  {
    id: 'emp-2',
    employeeId: 'DF-1002',
    name: 'Alex Rivera',
    email: 'alex.rivera@dayflow.com',
    phone: '+1 (555) 876-5432',
    address: '120 Market Street, Apt 4B, San Francisco, CA',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    department: 'Engineering',
    position: 'Senior Frontend Developer',
    joiningDate: '2023-01-10',
    manager: 'Sarah Jenkins',
    role: 'employee',
    status: 'Active',
    salary: {
      basic: 65000,
      hra: 26000,
      specialAllowance: 14000,
      pf: 7800,
      tax: 9200,
      netSalary: 88000
    },
    documents: [
      { id: 'doc-3', title: 'Offer Letter.pdf', type: 'PDF', uploadDate: '2023-01-10', size: '1.8 MB' },
      { id: 'doc-4', title: 'Degree Certificate.pdf', type: 'PDF', uploadDate: '2023-01-10', size: '3.0 MB' }
    ],
    leaveBalance: { paid: 14, sick: 7, unpaid: 3 }
  },
  {
    id: 'emp-3',
    employeeId: 'DF-1003',
    name: 'Priya Sharma',
    email: 'priya.sharma@dayflow.com',
    phone: '+1 (555) 345-6789',
    address: '450 Mission St, Suite 800, San Francisco, CA',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    department: 'Product & Design',
    position: 'Lead Product Designer',
    joiningDate: '2023-06-01',
    manager: 'Sarah Jenkins',
    role: 'employee',
    status: 'Active',
    salary: {
      basic: 62000,
      hra: 24800,
      specialAllowance: 13200,
      pf: 7440,
      tax: 8560,
      netSalary: 84000
    },
    documents: [
      { id: 'doc-5', title: 'Design Portfolio.pdf', type: 'PDF', uploadDate: '2023-06-01', size: '5.2 MB' }
    ],
    leaveBalance: { paid: 12, sick: 8, unpaid: 2 }
  },
  {
    id: 'emp-4',
    employeeId: 'DF-1004',
    name: 'Marcus Vance',
    email: 'marcus.vance@dayflow.com',
    phone: '+1 (555) 901-2345',
    address: '89 Bush Street, San Francisco, CA',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    department: 'Quality Assurance',
    position: 'QA Automation Lead',
    joiningDate: '2023-09-15',
    manager: 'Sarah Jenkins',
    role: 'employee',
    status: 'On Leave',
    salary: {
      basic: 55000,
      hra: 22000,
      specialAllowance: 11000,
      pf: 6600,
      tax: 7400,
      netSalary: 74000
    },
    documents: [],
    leaveBalance: { paid: 10, sick: 5, unpaid: 1 }
  }
];

const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-1',
    employeeId: 'DF-1001',
    employeeName: 'Sarah Jenkins',
    date: new Date().toISOString().split('T')[0],
    checkIn: '08:45 AM',
    checkOut: null,
    totalHours: 4.2,
    status: 'Present',
    notes: 'On-site HR Management'
  },
  {
    id: 'att-2',
    employeeId: 'DF-1002',
    employeeName: 'Alex Rivera',
    date: new Date().toISOString().split('T')[0],
    checkIn: '09:00 AM',
    checkOut: null,
    totalHours: 3.9,
    status: 'Present',
    notes: 'Frontend sprint session'
  },
  {
    id: 'att-3',
    employeeId: 'DF-1003',
    employeeName: 'Priya Sharma',
    date: new Date().toISOString().split('T')[0],
    checkIn: '09:15 AM',
    checkOut: null,
    totalHours: 3.6,
    status: 'Present',
    notes: 'UI audit reviews'
  },
  {
    id: 'att-4',
    employeeId: 'DF-1004',
    employeeName: 'Marcus Vance',
    date: new Date().toISOString().split('T')[0],
    checkIn: null,
    checkOut: null,
    totalHours: 0,
    status: 'Leave',
    notes: 'Approved Annual Leave'
  }
];

const INITIAL_LEAVES: LeaveRequest[] = [
  {
    id: 'lv-1',
    employeeId: 'DF-1002',
    employeeName: 'Alex Rivera',
    leaveType: 'Paid',
    startDate: '2026-08-25',
    endDate: '2026-08-27',
    totalDays: 3,
    reason: 'Family event and rest.',
    status: 'Pending',
    createdAt: '2026-08-20'
  },
  {
    id: 'lv-2',
    employeeId: 'DF-1003',
    employeeName: 'Priya Sharma',
    leaveType: 'Sick',
    startDate: '2026-08-18',
    endDate: '2026-08-19',
    totalDays: 2,
    reason: 'Flu & doctor consultation',
    status: 'Approved',
    hrComment: 'Approved. Get well soon!',
    createdAt: '2026-08-18'
  },
  {
    id: 'lv-3',
    employeeId: 'DF-1004',
    employeeName: 'Marcus Vance',
    leaveType: 'Paid',
    startDate: '2026-08-21',
    endDate: '2026-08-22',
    totalDays: 2,
    reason: 'Personal time off.',
    status: 'Approved',
    hrComment: 'Approved by Sarah.',
    createdAt: '2026-08-19'
  }
];

const INITIAL_PAYROLL: PayrollRecord[] = [
  {
    id: 'pay-1',
    employeeId: 'DF-1001',
    employeeName: 'Sarah Jenkins',
    month: 'August 2026',
    basic: 75000,
    hra: 30000,
    allowances: 15000,
    deductions: 20000,
    netPay: 100000,
    status: 'Paid',
    paymentDate: '2026-08-01'
  },
  {
    id: 'pay-2',
    employeeId: 'DF-1002',
    employeeName: 'Alex Rivera',
    month: 'August 2026',
    basic: 65000,
    hra: 26000,
    allowances: 14000,
    deductions: 17000,
    netPay: 88000,
    status: 'Paid',
    paymentDate: '2026-08-01'
  },
  {
    id: 'pay-3',
    employeeId: 'DF-1003',
    employeeName: 'Priya Sharma',
    month: 'August 2026',
    basic: 62000,
    hra: 24800,
    allowances: 13200,
    deductions: 16000,
    netPay: 84000,
    status: 'Paid',
    paymentDate: '2026-08-01'
  }
];

export class HRMSStorage {
  private static isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  // Initialize defaults if empty
  public static init() {
    if (!this.isBrowser()) return;
    if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEES)) {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) {
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(INITIAL_ATTENDANCE));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LEAVES)) {
      localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(INITIAL_LEAVES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PAYROLL)) {
      localStorage.setItem(STORAGE_KEYS.PAYROLL, JSON.stringify(INITIAL_PAYROLL));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
      // Default logged in as Sarah Jenkins (HR Director) or Alex Rivera
      const defaultUser: User = {
        id: INITIAL_EMPLOYEES[0].id,
        employeeId: INITIAL_EMPLOYEES[0].employeeId,
        name: INITIAL_EMPLOYEES[0].name,
        email: INITIAL_EMPLOYEES[0].email,
        role: INITIAL_EMPLOYEES[0].role,
        avatar: INITIAL_EMPLOYEES[0].avatar,
        department: INITIAL_EMPLOYEES[0].department,
        position: INITIAL_EMPLOYEES[0].position
      };
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(defaultUser));
    }
  }

  // Auth Operations
  public static getCurrentUser(): User | null {
    if (!this.isBrowser()) return null;
    this.init();
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  }

  public static setCurrentUser(user: User) {
    if (!this.isBrowser()) return;
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  }

  public static switchRole(role: 'employee' | 'hr') {
    const employees = this.getEmployees();
    const target = employees.find(e => e.role === role) || employees[0];
    const user: User = {
      id: target.id,
      employeeId: target.employeeId,
      name: target.name,
      email: target.email,
      role: role,
      avatar: target.avatar,
      department: target.department,
      position: target.position
    };
    this.setCurrentUser(user);
    return user;
  }

  // Employees
  public static getEmployees(): EmployeeProfile[] {
    if (!this.isBrowser()) return INITIAL_EMPLOYEES;
    this.init();
    const data = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    return data ? JSON.parse(data) : INITIAL_EMPLOYEES;
  }

  public static getEmployeeById(id: string): EmployeeProfile | undefined {
    return this.getEmployees().find(e => e.id === id || e.employeeId === id);
  }

  public static updateEmployeeProfile(id: string, updates: Partial<EmployeeProfile>): EmployeeProfile | null {
    const employees = this.getEmployees();
    const index = employees.findIndex(e => e.id === id || e.employeeId === id);
    if (index === -1) return null;
    
    employees[index] = { ...employees[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
    return employees[index];
  }

  // Attendance & Live Check-in
  public static getAttendanceRecords(): AttendanceRecord[] {
    if (!this.isBrowser()) return INITIAL_ATTENDANCE;
    this.init();
    const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    return data ? JSON.parse(data) : INITIAL_ATTENDANCE;
  }

  public static getTodayAttendance(employeeId: string): AttendanceRecord | undefined {
    const today = new Date().toISOString().split('T')[0];
    return this.getAttendanceRecords().find(
      r => (r.employeeId === employeeId || r.employeeId === this.getEmployeeById(employeeId)?.employeeId) && r.date === today
    );
  }

  public static checkIn(employeeId: string): AttendanceRecord {
    const records = this.getAttendanceRecords();
    const emp = this.getEmployeeById(employeeId);
    const today = new Date().toISOString().split('T')[0];
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let existing = records.find(r => r.employeeId === (emp?.employeeId || employeeId) && r.date === today);

    if (existing) {
      existing.checkIn = nowStr;
      existing.status = 'Present';
    } else {
      existing = {
        id: 'att-' + Date.now(),
        employeeId: emp?.employeeId || employeeId,
        employeeName: emp?.name || 'Employee',
        date: today,
        checkIn: nowStr,
        checkOut: null,
        totalHours: 0.1,
        status: 'Present'
      };
      records.unshift(existing);
    }

    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
    return existing;
  }

  public static checkOut(employeeId: string): AttendanceRecord {
    const records = this.getAttendanceRecords();
    const emp = this.getEmployeeById(employeeId);
    const today = new Date().toISOString().split('T')[0];
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const existing = records.find(r => r.employeeId === (emp?.employeeId || employeeId) && r.date === today);
    if (existing) {
      existing.checkOut = nowStr;
      existing.totalHours = 8.0; // Simulated full day
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
      return existing;
    }

    return this.checkIn(employeeId);
  }

  // Leave Requests
  public static getLeaveRequests(): LeaveRequest[] {
    if (!this.isBrowser()) return INITIAL_LEAVES;
    this.init();
    const data = localStorage.getItem(STORAGE_KEYS.LEAVES);
    return data ? JSON.parse(data) : INITIAL_LEAVES;
  }

  public static submitLeaveRequest(request: Omit<LeaveRequest, 'id' | 'status' | 'createdAt'>): LeaveRequest {
    const requests = this.getLeaveRequests();
    const newReq: LeaveRequest = {
      ...request,
      id: 'lv-' + Date.now(),
      status: 'Pending',
      createdAt: new Date().toISOString().split('T')[0]
    };
    requests.unshift(newReq);
    localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(requests));
    return newReq;
  }

  public static updateLeaveStatus(id: string, status: 'Approved' | 'Rejected', hrComment?: string): LeaveRequest | null {
    const requests = this.getLeaveRequests();
    const req = requests.find(r => r.id === id);
    if (!req) return null;

    req.status = status;
    if (hrComment) req.hrComment = hrComment;

    // Deduct leave balance if approved
    if (status === 'Approved') {
      const emp = this.getEmployeeById(req.employeeId);
      if (emp) {
        const typeKey = req.leaveType.toLowerCase() as 'paid' | 'sick' | 'unpaid';
        if (emp.leaveBalance[typeKey] !== undefined) {
          emp.leaveBalance[typeKey] = Math.max(0, emp.leaveBalance[typeKey] - req.totalDays);
          this.updateEmployeeProfile(emp.id, { leaveBalance: emp.leaveBalance });
        }
      }
    }

    localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(requests));
    return req;
  }

  // Payroll
  public static getPayrollRecords(): PayrollRecord[] {
    if (!this.isBrowser()) return INITIAL_PAYROLL;
    this.init();
    const data = localStorage.getItem(STORAGE_KEYS.PAYROLL);
    return data ? JSON.parse(data) : INITIAL_PAYROLL;
  }

  public static updateSalaryStructure(employeeId: string, salary: Partial<EmployeeProfile['salary']>) {
    const emp = this.getEmployeeById(employeeId);
    if (!emp) return;

    const updatedSalary = { ...emp.salary, ...salary };
    updatedSalary.netSalary = (updatedSalary.basic + updatedSalary.hra + updatedSalary.specialAllowance) - (updatedSalary.pf + updatedSalary.tax);
    this.updateEmployeeProfile(emp.id, { salary: updatedSalary });
  }
}
