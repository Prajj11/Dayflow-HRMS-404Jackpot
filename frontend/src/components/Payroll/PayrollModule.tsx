import React, { useState } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { HRMSStorage } from '../../services/hrmsStorage';
import { EmployeeProfile, PayrollRecord } from '../../types/hrms';
import {
  CreditCard,
  Printer,
  Download,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Edit,
  Save,
  Building2,
  FileText,
  Lock
} from 'lucide-react';

export const PayrollModule: React.FC = () => {
  const { payroll, employees, activeRole, currentUser, selectedEmployeeId, setSelectedEmployeeId, refreshData, showToast } = useHRMS();
  
  const isHR = activeRole === 'hr';

  // Target employee profile
  const employee: EmployeeProfile = employees.find(
    e => e.employeeId === selectedEmployeeId || e.id === selectedEmployeeId
  ) || employees[0];

  // Selected payroll record
  const userPayroll: PayrollRecord = payroll.find(
    p => p.employeeId === employee.employeeId || p.employeeName === employee.name
  ) || {
    id: 'pay-default',
    employeeId: employee.employeeId,
    employeeName: employee.name,
    month: 'August 2026',
    basic: employee.salary.basic,
    hra: employee.salary.hra,
    allowances: employee.salary.specialAllowance,
    deductions: employee.salary.pf + employee.salary.tax,
    netPay: employee.salary.netSalary,
    status: 'Paid',
    paymentDate: '2026-08-01'
  };

  // State for HR Salary Editing
  const [isEditingSalary, setIsEditingSalary] = useState(false);
  const [basicInput, setBasicInput] = useState(employee.salary.basic);
  const [hraInput, setHraInput] = useState(employee.salary.hra);
  const [allowanceInput, setAllowanceInput] = useState(employee.salary.specialAllowance);

  const handlePrintPayslip = () => {
    window.print();
  };

  const handleUpdateSalary = (e: React.FormEvent) => {
    e.preventDefault();
    HRMSStorage.updateSalaryStructure(employee.id, {
      basic: Number(basicInput),
      hra: Number(hraInput),
      specialAllowance: Number(allowanceInput)
    });
    refreshData();
    setIsEditingSalary(false);
    showToast(`Salary structure for ${employee.name} updated!`, 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            <CreditCard className="h-4 w-4" />
            Payroll & Compensation
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {isHR ? 'HR Admin Payroll Control Center' : 'My Salary Slip & Compensation'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isHR
              ? 'View company payroll, update employee salary structures, and process disbursements.'
              : 'Read-only itemized salary breakdown and digital payslip viewer.'}
          </p>
        </div>

        {/* Employee Selector for HR */}
        {isHR && (
          <div className="flex items-center gap-2">
            <select
              value={employee.employeeId}
              onChange={e => setSelectedEmployeeId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.employeeId}>
                  {emp.name} ({emp.employeeId}) - Net: ${emp.salary.netSalary.toLocaleString()}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Employee Read-only Notice */}
      {!isHR && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
          <Lock className="h-4 w-4 shrink-0" />
          <span>
            Payroll information is read-only for employees. For salary adjustments or tax forms, contact your HR Administrator.
          </span>
        </div>
      )}

      {/* Main Interactive Payslip Card */}
      <div id="printable-payslip" className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Dayflow HRMS Technologies Inc.
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official Monthly Salary Voucher • {userPayroll.month}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintPayslip}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Printer className="h-4 w-4" />
              Print Payslip
            </button>
            <button
              onClick={() => showToast(`Downloading ${employee.name}_Payslip_${userPayroll.month}.pdf`, 'success')}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-500"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Employee & Payment Metadata Grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50 md:grid-cols-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Employee Name</span>
            <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{employee.name}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Employee ID</span>
            <p className="text-xs font-bold text-slate-900 dark:text-white font-mono mt-0.5">{employee.employeeId}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Department</span>
            <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{employee.department}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Payment Date</span>
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {userPayroll.paymentDate}
            </p>
          </div>
        </div>

        {/* Itemized Breakdown Table */}
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          {/* Earnings Column */}
          <div>
            <h4 className="border-b border-indigo-200 pb-2 text-xs font-bold uppercase text-indigo-700 dark:border-indigo-800 dark:text-indigo-400">
              Gross Earnings
            </h4>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Basic Pay</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  ${userPayroll.basic.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">House Rent Allowance (HRA)</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  ${userPayroll.hra.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Special & Performance Allowances</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  ${userPayroll.allowances.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-2 text-sm font-extrabold text-indigo-700 dark:text-indigo-300 border-t border-slate-200 dark:border-slate-700">
                <span>Total Gross Earnings</span>
                <span className="font-mono">
                  ${(userPayroll.basic + userPayroll.hra + userPayroll.allowances).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Deductions Column */}
          <div>
            <h4 className="border-b border-rose-200 pb-2 text-xs font-bold uppercase text-rose-700 dark:border-rose-800 dark:text-rose-400">
              Standard Deductions
            </h4>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Provident Fund (PF)</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  ${(employee.salary.pf).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Tax Deducted at Source (TDS)</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  ${(employee.salary.tax).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-2 text-sm font-extrabold text-rose-700 dark:text-rose-400 border-t border-slate-200 dark:border-slate-700">
                <span>Total Deductions</span>
                <span className="font-mono">
                  ${userPayroll.deductions.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Net Salary Highlight Box */}
        <div className="mt-8 flex flex-col justify-between items-center rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white sm:flex-row">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
              Net Payable Take-Home Amount
            </span>
            <p className="text-xs text-slate-400">Transferred via Direct Deposit to Verified Account</p>
          </div>
          <div className="mt-2 text-3xl font-black font-mono text-emerald-400 sm:mt-0">
            ${userPayroll.netPay.toLocaleString()}
          </div>
        </div>
      </div>

      {/* HR Admin Payroll Editor */}
      {isHR && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Admin Salary Structure Modifier
            </h3>
            <button
              onClick={() => setIsEditingSalary(!isEditingSalary)}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-500"
            >
              <Edit className="h-4 w-4" />
              {isEditingSalary ? 'Close Editor' : `Modify ${employee.name}'s Salary`}
            </button>
          </div>

          {isEditingSalary && (
            <form onSubmit={handleUpdateSalary} className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Basic Pay ($)
                </label>
                <input
                  type="number"
                  value={basicInput}
                  onChange={e => setBasicInput(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  HRA ($)
                </label>
                <input
                  type="number"
                  value={hraInput}
                  onChange={e => setHraInput(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Special Allowance ($)
                </label>
                <input
                  type="number"
                  value={allowanceInput}
                  onChange={e => setAllowanceInput(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="md:col-span-3">
                <button
                  type="submit"
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500"
                >
                  <Save className="h-4 w-4" />
                  Save Salary Update
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
