import { supabase } from '../lib/supabase';
import type { AttendanceRecord, Employee, LeaveRequest, Region } from '../types/database';

export type AttendanceEmployee = Pick<Employee, 'id' | 'full_name' | 'employee_code' | 'region_id'> & {
  region: Pick<Region, 'id' | 'code' | 'name'> | null;
};

export type AttendanceMonthData = {
  employees: AttendanceEmployee[];
  attendanceRecords: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  regions: Region[];
};

type EmployeeRowWithRegion = Pick<Employee, 'id' | 'full_name' | 'employee_code' | 'region_id'> & {
  regions: Pick<Region, 'id' | 'code' | 'name'> | null;
};

export const attendanceManagementService = {
  async getMonthData(month: string, regionId: string): Promise<AttendanceMonthData> {
    const range = getMonthRange(month);
    const employeesQuery = supabase
      .from('employees')
      .select('id, full_name, employee_code, region_id, regions:region_id(id, code, name)')
      .is('deleted_at', null)
      .order('full_name', { ascending: true });

    const scopedEmployeesQuery = regionId ? employeesQuery.eq('region_id', regionId) : employeesQuery;

    const [employeesResult, attendanceResult, leaveResult, regionsResult] = await Promise.all([
      scopedEmployeesQuery,
      supabase
        .from('attendance_records')
        .select('*')
        .gte('punched_at', range.startIso)
        .lt('punched_at', range.endIso)
        .order('punched_at', { ascending: true }),
      supabase
        .from('leave_requests')
        .select('*')
        .lte('start_date', range.endDate)
        .gte('end_date', range.startDate)
        .order('start_date', { ascending: true }),
      supabase.from('regions').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
    ]);

    if (employeesResult.error) {
      throw employeesResult.error;
    }

    if (attendanceResult.error) {
      throw attendanceResult.error;
    }

    if (leaveResult.error) {
      throw leaveResult.error;
    }

    if (regionsResult.error) {
      throw regionsResult.error;
    }

    return {
      employees: ((employeesResult.data ?? []) as unknown as EmployeeRowWithRegion[]).map((employee) => ({
        id: employee.id,
        full_name: employee.full_name,
        employee_code: employee.employee_code,
        region_id: employee.region_id,
        region: employee.regions,
      })),
      attendanceRecords: attendanceResult.data ?? [],
      leaveRequests: leaveResult.data ?? [],
      regions: regionsResult.data ?? [],
    };
  },
};

function getMonthRange(month: string) {
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    startDate: toDateKey(start),
    endDate: toDateKey(lastDay),
  };
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
