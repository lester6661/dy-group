import { supabase } from '../lib/supabase';
import type { LeaveType, Region } from '../types/database';

export type LeaveCalendarItem = {
  leave_request_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string | null;
  region_id: string | null;
  region_code: string | null;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  leave_date: string;
};

export type LeaveCalendarMonthData = {
  leaves: LeaveCalendarItem[];
  regions: Region[];
};

export const scheduleService = {
  async getLeaveCalendar(month: string, regionId: string): Promise<LeaveCalendarMonthData> {
    const range = getMonthRange(month);

    const [leavesResult, regionsResult] = await Promise.all([
      supabase.rpc('get_leave_calendar', {
        month_start: range.startDate,
        month_end: range.endDate,
        region_filter: regionId || null,
      }),
      supabase.from('regions').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
    ]);

    if (leavesResult.error) {
      throw leavesResult.error;
    }

    if (regionsResult.error) {
      throw regionsResult.error;
    }

    return {
      leaves: (leavesResult.data ?? []) as LeaveCalendarItem[],
      regions: regionsResult.data ?? [],
    };
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

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
