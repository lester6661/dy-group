import { supabase } from '../lib/supabase';
import type { Employee, Region, ScheduleEntry, Shift } from '../types/database';

export type ScheduleEmployee = Pick<Employee, 'id' | 'full_name' | 'employee_code' | 'profile_id' | 'region_id'> & {
  region: Pick<Region, 'id' | 'code' | 'name'> | null;
};

export type ScheduleEntryItem = ScheduleEntry & {
  shift: Shift | null;
};

export type ScheduleMonthData = {
  employees: ScheduleEmployee[];
  shifts: Shift[];
  entries: ScheduleEntryItem[];
  regions: Region[];
};

type EmployeeRow = Pick<Employee, 'id' | 'full_name' | 'employee_code' | 'profile_id' | 'region_id'> & {
  regions: Pick<Region, 'id' | 'code' | 'name'> | null;
};

type ScheduleEntryRow = ScheduleEntry & {
  shifts: Shift | null;
};

export type ShiftFormValues = {
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  is_active: boolean;
};

export type ScheduleEntryValues = {
  employee_id: string;
  work_date: string;
  shift_id: string;
  is_day_off: boolean;
  note: string;
  profile_id: string;
};

export const scheduleService = {
  async getMonthData(month: string, regionId: string): Promise<ScheduleMonthData> {
    const range = getMonthRange(month);
    const employeesQuery = supabase
      .from('employees')
      .select('id, full_name, employee_code, profile_id, region_id, regions:region_id(id, code, name)')
      .is('deleted_at', null)
      .order('full_name', { ascending: true });

    const scopedEmployeesQuery = regionId ? employeesQuery.eq('region_id', regionId) : employeesQuery;

    const [employeesResult, shiftsResult, entriesResult, regionsResult] = await Promise.all([
      scopedEmployeesQuery,
      supabase.from('shifts').select('*').order('start_time', { ascending: true }),
      supabase
        .from('schedule_entries')
        .select('*, shifts:shift_id(*)')
        .gte('work_date', range.startDate)
        .lte('work_date', range.endDate)
        .order('work_date', { ascending: true }),
      supabase.from('regions').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
    ]);

    if (employeesResult.error) {
      throw employeesResult.error;
    }

    if (shiftsResult.error) {
      throw shiftsResult.error;
    }

    if (entriesResult.error) {
      throw entriesResult.error;
    }

    if (regionsResult.error) {
      throw regionsResult.error;
    }

    return {
      employees: ((employeesResult.data ?? []) as unknown as EmployeeRow[]).map((employee) => ({
        id: employee.id,
        full_name: employee.full_name,
        employee_code: employee.employee_code,
        profile_id: employee.profile_id,
        region_id: employee.region_id,
        region: employee.regions,
      })),
      shifts: shiftsResult.data ?? [],
      entries: ((entriesResult.data ?? []) as unknown as ScheduleEntryRow[]).map((entry) => ({
        ...entry,
        shift: entry.shifts,
      })),
      regions: regionsResult.data ?? [],
    };
  },

  async createShift(values: ShiftFormValues) {
    const { error } = await supabase.from('shifts').insert(normalizeShift(values));

    if (error) {
      throw error;
    }
  },

  async updateShift(shiftId: string, values: ShiftFormValues) {
    const { error } = await supabase.from('shifts').update(normalizeShift(values)).eq('id', shiftId);

    if (error) {
      throw error;
    }
  },

  async saveScheduleEntry(values: ScheduleEntryValues) {
    const payload = {
      employee_id: values.employee_id,
      work_date: values.work_date,
      shift_id: values.is_day_off ? null : values.shift_id,
      is_day_off: values.is_day_off,
      note: values.note.trim() || null,
      created_by: values.profile_id,
      updated_by: values.profile_id,
    };

    const { error } = await supabase
      .from('schedule_entries')
      .upsert(payload, { onConflict: 'employee_id,work_date' });

    if (error) {
      throw error;
    }
  },
};

export function getMonthRange(month: string) {
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);

  return {
    startDate: toDateKey(start),
    endDate: toDateKey(end),
  };
}

function normalizeShift(values: ShiftFormValues) {
  return {
    name: values.name.trim(),
    start_time: values.start_time,
    end_time: values.end_time,
    break_minutes: Math.max(0, Number(values.break_minutes) || 0),
    is_active: values.is_active,
  };
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
