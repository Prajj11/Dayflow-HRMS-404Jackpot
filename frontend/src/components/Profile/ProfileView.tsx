import React, { useState } from 'react';
import { useHRMS } from '../../context/HRMSContext';
import { HRMSStorage } from '../../services/hrmsStorage';
import { EmployeeProfile } from '../../types/hrms';
import {
  User,
  Briefcase,
  CreditCard,
  FileText,
  Edit,
  Save,
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Building,
  Upload,
  Download,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { employees, selectedEmployeeId, setSelectedEmployeeId, activeRole, currentUser, refreshData, showToast } = useHRMS();
  const [activeTab, setActiveTab] = useState<'personal' | 'job' | 'salary' | 'documents'>('personal');

  // Selected employee profile
  const employee: EmployeeProfile = employees.find(
    e => e.employeeId === selectedEmployeeId || e.id === selectedEmployeeId
  ) || employees[0];

  const canEditAll = activeRole === 'hr';

  // Edit Drawer state
  const [isEditing, setIsEditing] = useState(false);
  const [phoneInput, setPhoneInput] = useState(employee?.phone || '');
  const [addressInput, setAddressInput] = useState(employee?.address || '');
  const [positionInput, setPositionInput] = useState(employee?.position || '');
  const [departmentInput, setDepartmentInput] = useState(employee?.department || '');
  const [basicSalaryInput, setBasicSalaryInput] = useState(employee?.salary?.basic || 60000);

  const startEdit = () => {
    setPhoneInput(employee.phone);
    setAddressInput(employee.address);
    setPositionInput(employee.position);
    setDepartmentInput(employee.department);
    setBasicSalaryInput(employee.salary.basic);
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updates: Partial<EmployeeProfile> = {
      phone: phoneInput,
      address: addressInput
    };

    if (canEditAll) {
      updates.position = positionInput;
      updates.department = departmentInput;
      const updatedSalary = {
        ...employee.salary,
        basic: Number(basicSalaryInput),
        hra: Math.round(Number(basicSalaryInput) * 0.4),
        specialAllowance: Math.round(Number(basicSalaryInput) * 0.2)
      };
      updatedSalary.netSalary = (updatedSalary.basic + updatedSalary.hra + updatedSalary.specialAllowance) - (updatedSalary.pf + updatedSalary.tax);
      updates.salary = updatedSalary;
    }

    HRMSStorage.updateEmployeeProfile(employee.id, updates);
    refreshData();
    setIsEditing(false);
    showToast(`Profile for ${employee.name} updated successfully!`, 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Employee Selector Bar for HR Admin */}
      {activeRole === 'hr' && (
        <div className="flex items-center justify-between rounded-xl bg-slate-100 p-2.5 dark:bg-slate-800">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            Viewing Employee:
          </span>
          <select
            value={employee.employeeId}
            onChange={e => setSelectedEmployeeId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {employees.map(emp => (
              <option key={emp.id} value={emp.employeeId}>
                {emp.name} ({emp.employeeId}) - {emp.department}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <img
              src={employee.avatar}
              alt={employee.name}
              className="h-20 w-20 rounded-2xl object-cover border-2 border-indigo-600 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {employee.name}
                </h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    employee.status === 'Active'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {employee.status}
                </span>
              </div>
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {employee.position} • {employee.department}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Employee ID: {employee.employeeId} | Joined: {employee.joiningDate}
              </p>
            </div>
          </div>

          <button
            onClick={startEdit}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-all"
          >
            <Edit className="h-4 w-4" />
            {canEditAll ? 'Edit All Details (Admin)' : 'Edit Contact Info'}
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 flex border-b border-slate-100 dark:border-slate-800">
          {[
            { id: 'personal', label: 'Personal Details', icon: User },
            { id: 'job', label: 'Job Details', icon: Briefcase },
            { id: 'salary', label: 'Salary Structure', icon: CreditCard },
            { id: 'documents', label: 'Documents & Attachments', icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-all ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Display */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Personal Details */}
        {activeTab === 'personal' && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Work Email</span>
              <p className="mt-1 text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Mail className="h-4 w-4 text-indigo-500" />
                {employee.email}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</span>
              <p className="mt-1 text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Phone className="h-4 w-4 text-indigo-500" />
                {employee.phone}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40 md:col-span-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Residential Address</span>
              <p className="mt-1 text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="h-4 w-4 text-indigo-500" />
                {employee.address}
              </p>
            </div>
          </div>
        )}

        {/* Job Details */}
        {activeTab === 'job' && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Department</span>
              <p className="mt-1 text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="h-4 w-4 text-indigo-500" />
                {employee.department}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Reporting Manager</span>
              <p className="mt-1 text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-500" />
                {employee.manager}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Designation</span>
              <p className="mt-1 text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-indigo-500" />
                {employee.position}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Joining Date</span>
              <p className="mt-1 text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-500" />
                {employee.joiningDate}
              </p>
            </div>
          </div>
        )}

        {/* Salary Structure */}
        {activeTab === 'salary' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Monthly Compensation Breakdown
              </h4>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                Net Pay: ${employee.salary.netSalary.toLocaleString()} / mo
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/50">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Basic Salary</p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                  ${employee.salary.basic.toLocaleString()}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/50">
                <p className="text-[10px] font-bold text-slate-400 uppercase">House Rent Allowance (HRA)</p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                  ${employee.salary.hra.toLocaleString()}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/50">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Special Allowances</p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                  ${employee.salary.specialAllowance.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3.5 dark:border-rose-950/50 dark:bg-rose-950/20">
              <p className="text-xs font-bold text-rose-700 dark:text-rose-400">Standard Deductions</p>
              <div className="mt-2 flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Provident Fund (PF): ${employee.salary.pf.toLocaleString()}</span>
                <span>Income Tax (TDS): ${employee.salary.tax.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Employee Verification Documents
              </h4>
              <button
                onClick={() => showToast('Document upload simulated!', 'info')}
                className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload New Document
              </button>
            </div>

            {employee.documents.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No documents uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {employee.documents.map(doc => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-indigo-600" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{doc.title}</p>
                        <p className="text-[10px] text-slate-400">
                          {doc.size} • Uploaded on {doc.uploadDate}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => showToast(`Downloading ${doc.title}...`, 'success')}
                      className="flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Drawer / Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Edit Profile: {employee.name}
              </h3>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Residential Address
                </label>
                <input
                  type="text"
                  value={addressInput}
                  onChange={e => setAddressInput(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {canEditAll && (
                <>
                  <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase">
                      Admin Privileged Fields
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Designation
                    </label>
                    <input
                      type="text"
                      value={positionInput}
                      onChange={e => setPositionInput(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Department
                    </label>
                    <input
                      type="text"
                      value={departmentInput}
                      onChange={e => setDepartmentInput(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Basic Pay ($)
                    </label>
                    <input
                      type="number"
                      value={basicSalaryInput}
                      onChange={e => setBasicSalaryInput(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </>
              )}

              <div className="mt-5 flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                >
                  Save Profile Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
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
