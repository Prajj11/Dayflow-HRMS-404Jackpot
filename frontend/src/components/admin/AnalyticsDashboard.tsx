import React from "react";
import { BarChart3, PieChart as PieIcon, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmployeeData } from "./AddEditEmployeeModal";

export interface AttendanceTrendPoint {
  day: string;
  present: number;
}

export interface LeaveTypeSlice {
  name: string;
  value: number;
  color: string;
}

interface AnalyticsDashboardProps {
  employees: EmployeeData[];
  attendanceTrend: AttendanceTrendPoint[];
  leaveTypeData: LeaveTypeSlice[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  employees,
  attendanceTrend,
  leaveTypeData,
}) => {
  const deptCounts: Record<string, number> = {};
  employees.forEach((emp) => {
    deptCounts[emp.department] = (deptCounts[emp.department] || 0) + 1;
  });

  const departmentData = Object.entries(deptCounts).map(([dept, count]) => ({
    department: dept,
    count,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <TrendingUp className="h-4 w-4 text-primary" />
                Attendance, Past 7 Days
              </h3>
              <p className="text-xs text-muted-foreground">
                Employees present each day across the organization.
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            {attendanceTrend.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No attendance data yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e1e24", borderRadius: "12px", border: "none", color: "#fff" }}
                  />
                  <Area type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#presentGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <PieIcon className="h-4 w-4 text-purple-500" />
              Leave Distribution
            </h3>
            <p className="text-xs text-muted-foreground">
              Breakdown of all leave requests by type.
            </p>
          </div>

          <div className="h-48 w-full">
            {leaveTypeData.every((s) => s.value === 0) ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No leave requests yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={leaveTypeData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value">
                    {leaveTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-2 space-y-1.5 border-t border-border pt-3">
            {leaveTypeData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-semibold text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            Department Headcount
          </h3>
          <p className="text-xs text-muted-foreground">
            Total employees per department.
          </p>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={departmentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="department" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#714B67" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
