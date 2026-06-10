import { supabase } from '../lib/supabase';
import type { LeaveType, Region } from '../types/database';

export type LeaveCalendarItem = {
  leave_request_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string | null;
  region_id: string | null;
  region_code: string | null;
  leave_type: LeaveType | 'rest';
  start_date: string;
  end_date: string;
  leave_date: string;
  source?: 'manual' | 'auto';
};

export type LeaveCalendarMonthData = {
  leaves: LeaveCalendarItem[];
  regions: Region[];
};

export const scheduleService = {
  async getLeaveCalendar(month: string, regionId: string): Promise<LeaveCalendarMonthData> {
    const range = getMonthRange(month);

    const previousCycle = getPreviousCycle(parseCycle(month));
    const currentCycle = parseCycle(month);
    const nextCycle = getNextCycle(currentCycle);

    const [leavesResult, previousRestResult, restResult, nextRestResult, regionsResult] = await Promise.all([
      supabase.rpc('get_leave_calendar', {
        month_start: range.startDate,
        month_end: range.endDate,
        region_filter: regionId || null,
      }),
      supabase.rpc('get_rest_day_calendar', {
        cycle_year: previousCycle.year,
        cycle_month: previousCycle.month,
        region_filter: regionId || null,
      }),
      supabase.rpc('get_rest_day_calendar', {
        cycle_year: currentCycle.year,
        cycle_month: currentCycle.month,
        region_filter: regionId || null,
      }),
      supabase.rpc('get_rest_day_calendar', {
        cycle_year: nextCycle.year,
        cycle_month: nextCycle.month,
        region_filter: regionId || null,
      }),
      supabase.from('regions').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
    ]);

    if (leavesResult.error) {
      throw leavesResult.error;
    }

    if (previousRestResult.error) {
      throw previousRestResult.error;
    }

    if (restResult.error) {
      throw restResult.error;
    }

    if (nextRestResult.error) {
      throw nextRestResult.error;
    }

    if (regionsResult.error) {
      throw regionsResult.error;
    }

    const restLeaves = [
      ...(previousRestResult.data ?? []),
      ...(restResult.data ?? []),
      ...(nextRestResult.data ?? []),
    ]
      .filter((restDay) => restDay.rest_date >= range.startDate && restDay.rest_date <= range.endDate)
      .map((restDay) => ({
        leave_request_id: restDay.rest_day_id,
        employee_id: restDay.employee_id,
        employee_name: restDay.employee_name,
        employee_code: restDay.employee_code,
        region_id: restDay.region_id,
        region_code: restDay.region_code,
        leave_type: 'rest' as const,
        start_date: restDay.rest_date,
        end_date: restDay.rest_date,
        leave_date: restDay.rest_date,
        source: restDay.source,
      }));

    return {
      leaves: dedupeLeaves([...((leavesResult.data ?? []) as LeaveCalendarItem[]), ...restLeaves]),
      regions: regionsResult.data ?? [],
    };
  },
};

export function getMonthRange(month: string) {
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const start = new Date(year, monthIndex - 1, 26);
  const end = new Date(year, monthIndex, 25);

  return {
    startDate: toDateKey(start),
    endDate: toDateKey(end),
  };
}

function parseCycle(month: string) {
  const [yearText, monthText] = month.split('-');
  return {
    year: Number(yearText),
    month: Number(monthText),
  };
}

function getNextCycle(cycle: { year: number; month: number }) {
  if (cycle.month === 12) {
    return { year: cycle.year + 1, month: 1 };
  }

  return { year: cycle.year, month: cycle.month + 1 };
}

function getPreviousCycle(cycle: { year: number; month: number }) {
  if (cycle.month === 1) {
    return { year: cycle.year - 1, month: 12 };
  }

  return { year: cycle.year, month: cycle.month - 1 };
}

function dedupeLeaves(leaves: LeaveCalendarItem[]) {
  const map = new Map<string, LeaveCalendarItem>();

  leaves.forEach((leave) => {
    map.set(`${leave.leave_request_id}:${leave.leave_date}:${leave.employee_id}:${leave.leave_type}`, leave);
  });

  return [...map.values()];
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
