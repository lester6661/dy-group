import { supabase } from '../lib/supabase';
import type { LeaveType, Region } from '../types/database';

export type CalendarLeaveType = Exclude<LeaveType, 'replacement'>;

export type PublicHolidayCalendarItem = {
  id: string;
  name: string;
  holiday_date: string;
};

export type LeaveCalendarItem = {
  leave_request_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string | null;
  region_id: string | null;
  region_code: string | null;
  leave_type: CalendarLeaveType;
  source_type: LeaveType;
  start_date: string;
  end_date: string;
  leave_date: string;
  applicant_name: string | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
  source?: 'manual' | 'auto';
};

export type LeaveCalendarMonthData = {
  leaves: LeaveCalendarItem[];
  publicHolidays: PublicHolidayCalendarItem[];
  regions: Region[];
};

type LeaveCalendarRpcRow = Omit<LeaveCalendarItem, 'leave_type' | 'source_type' | 'source'> & {
  leave_type: LeaveType;
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

    const regionCode = regionsResult.data?.find((region) => region.id === regionId)?.code ?? null;
    const approvedLeaves = ((leavesResult.data ?? []) as LeaveCalendarRpcRow[])
      .filter((leave) => leave.leave_type !== 'replacement')
      .map((leave) => ({
        ...leave,
        leave_type: leave.leave_type as CalendarLeaveType,
        source_type: leave.leave_type,
      }));

    return {
      leaves: dedupeLeaves(approvedLeaves),
      publicHolidays: getPublicHolidaysForRange(range.startDate, range.endDate, regionCode),
      regions: regionsResult.data ?? [],
    };
  },

  async canCancelCalendarLeave() {
    const { data, error } = await supabase.rpc('current_user_can_cancel_calendar_leave');

    if (error) {
      throw error;
    }

    return Boolean(data);
  },

  async cancelLeaveCalendarItem(item: LeaveCalendarItem, reason: string) {
    const { error } = await supabase.rpc('cancel_calendar_leave_item', {
      item_id: item.leave_request_id,
      item_type: item.source_type,
      cancel_reason: reason,
    });

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

function dedupeLeaves(leaves: LeaveCalendarItem[]) {
  const map = new Map<string, LeaveCalendarItem>();

  leaves.forEach((leave) => {
    map.set(`${leave.leave_request_id}:${leave.leave_date}:${leave.employee_id}:${leave.source_type}`, leave);
  });

  return [...map.values()];
}

type PublicHolidayDefinition = {
  date: string;
  name: string;
  regions?: string[];
  exceptRegions?: string[];
};

const malaysiaPublicHolidays2026: PublicHolidayDefinition[] = [
  { date: '2026-01-01', name: "New Year's Day" },
  { date: '2026-02-01', name: 'Thaipusam', regions: ['KL'] },
  { date: '2026-02-02', name: 'Thaipusam Holiday', regions: ['KL'] },
  { date: '2026-02-01', name: 'Federal Territory Day', regions: ['KL'] },
  { date: '2026-02-03', name: 'Federal Territory Day Holiday', regions: ['KL'] },
  { date: '2026-02-17', name: 'Chinese New Year' },
  { date: '2026-02-18', name: 'Chinese New Year Holiday' },
  { date: '2026-03-20', name: 'Hari Raya Aidilfitri Holiday' },
  { date: '2026-03-21', name: 'Hari Raya Aidilfitri' },
  { date: '2026-03-22', name: 'Hari Raya Aidilfitri Holiday' },
  { date: '2026-03-23', name: 'Hari Raya Aidilfitri Holiday' },
  { date: '2026-04-03', name: 'Good Friday', regions: ['KCH'] },
  { date: '2026-05-01', name: 'Labour Day' },
  { date: '2026-05-27', name: 'Hari Raya Haji' },
  { date: '2026-05-31', name: 'Wesak Day' },
  { date: '2026-06-01', name: "Agong's Birthday" },
  { date: '2026-06-01', name: 'Hari Gawai', regions: ['KCH'] },
  { date: '2026-06-02', name: 'Hari Gawai Holiday', regions: ['KCH'] },
  { date: '2026-06-03', name: 'Wesak Day Holiday', regions: ['KCH'] },
  { date: '2026-06-04', name: 'Hari Gawai Holiday', regions: ['KCH'] },
  { date: '2026-06-17', name: 'Awal Muharram' },
  { date: '2026-07-22', name: 'Sarawak Day', regions: ['KCH'] },
  { date: '2026-08-25', name: "Prophet Muhammad's Birthday" },
  { date: '2026-08-31', name: 'Merdeka Day' },
  { date: '2026-09-16', name: 'Malaysia Day' },
  { date: '2026-10-10', name: "Sarawak Governor's Birthday", regions: ['KCH'] },
  { date: '2026-11-08', name: 'Deepavali', exceptRegions: ['KCH'] },
  { date: '2026-11-09', name: 'Deepavali Holiday', exceptRegions: ['KCH'] },
  { date: '2026-12-25', name: 'Christmas Day' },
];

function getPublicHolidaysForRange(startDate: string, endDate: string, regionCode: string | null): PublicHolidayCalendarItem[] {
  return malaysiaPublicHolidays2026
    .filter((holiday) => holiday.date >= startDate && holiday.date <= endDate)
    .filter((holiday) => {
      if (!regionCode) return !holiday.regions;
      if (holiday.regions && !holiday.regions.includes(regionCode)) return false;
      if (holiday.exceptRegions?.includes(regionCode)) return false;
      return true;
    })
    .map((holiday) => ({
      id: `${holiday.date}:${holiday.name}`,
      name: holiday.name,
      holiday_date: holiday.date,
    }));
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
