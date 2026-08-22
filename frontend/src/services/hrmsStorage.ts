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
    id: 'emp-2',
    employeeId: 'DF-1002',
    name: 'Alex Rivera',
    email: 'alex.rivera@dayflow.com',
    phone: '+1 (555) 876-5432',
    address: '120 Market Street, Apt 4B, San Francisco, CA',
    avatar: '',
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
    id: 'emp-1',
    employeeId: 'DF-1001',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@dayflow.com',
    phone: '+1 (555) 234-5678',
    address: '742 Evergreen Terrace, San Francisco, CA',
    avatar: '',
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
    documents: [],
    leaveBalance: { paid: 18, sick: 10, unpaid: 5 }
  }
];

const INITIAL_ATTENDANCE: AttendanceRecord[] = [
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
  }
];

const INITIAL_PAYROLL: PayrollRecord[] = [
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
      const defaultUser: User = {
        id: INITIAL_EMPLOYEES[0].id,
        employeeId: INITIAL_EMPLOYEES[0].employeeId,
        name: INITIAL_EMPLOYEES[0].name,
        email: INITIAL_EMPLOYEES[0].email,
        role: INITIAL_EMPLOYEES[0].role,
        avatar: '',
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

    // Synchronize into employees profile list
    const employees = this.getEmployees();
    let emp = employees.find(e => e.email === user.email || e.employeeId === user.employeeId);
    if (!emp) {
      const newEmp: EmployeeProfile = {
        id: user.id || 'emp-' + Date.now(),
        employeeId: user.employeeId || 'DF-' + Math.floor(1000 + Math.random() * 9000),
        name: user.name,
        email: user.email,
        phone: '+1 (555) 123-4567',
        address: 'San Francisco, CA',
        avatar: '',
        department: user.department || 'Engineering',
        position: user.position || 'Software Engineer',
        joiningDate: new Date().toISOString().split('T')[0],
        manager: 'Sarah Jenkins',
        role: user.role || 'employee',
        status: 'Active',
        salary: { basic: 80000, hra: 32000, specialAllowance: 16000, pf: 9600, tax: 8400, netSalary: 110000 },
        documents: [],
        leaveBalance: { paid: 15, sick: 8, unpaid: 5 }
      };
      employees.unshift(newEmp);
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
    }
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

    // Also update current user if modifying self
    const currentUser = this.getCurrentUser();
    if (currentUser && (currentUser.id === id || currentUser.employeeId === id)) {
      this.setCurrentUser({
        ...currentUser,
        name: employees[index].name,
        email: employees[index].email,
        department: employees[index].department,
        position: employees[index].position
      });
    }

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
      existing.totalHours = 8.0;
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
