import { supabase } from '../lib/supabase';
import type { Employee, LeaveRequest, LeaveRequestStatus, LeaveType } from '../types/database';

export type LeaveFormValues = {
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
  medical_attachment_url?: string;
};

export type LeaveRequestItem = LeaveRequest & {
  employee: Pick<Employee, 'id' | 'full_name' | 'phone' | 'employee_code'> | null;
};

export type LeaveStats = Record<LeaveRequestStatus | 'total', number>;

export type RestDayCalendarItem = {
  rest_day_id: string;
  employee_id: string;
  profile_id: string;
  employee_name: string;
  employee_code: string | null;
  region_id: string | null;
  region_code: string | null;
  rest_date: string;
  source: 'manual' | 'auto';
  status: 'confirmed' | 'cancelled';
};

type LeaveRequestRowWithEmployee = LeaveRequest & {
  employees: Pick<Employee, 'id' | 'full_name' | 'phone' | 'employee_code'> | null;
};

export const leaveService = {
  async listMyLeaveRequests(profileId: string) {
    const { data, error } = await supabase
      .from('leave_requests')
      .select(
        `
        *,
        employees:employee_id(id, full_name, phone, employee_code)
      `,
      )
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return ((data ?? []) as unknown as LeaveRequestRowWithEmployee[]).map(mapLeaveRequestRow);
  },

  async listPendingLeaveRequests() {
    const { data, error } = await supabase
      .from('leave_requests')
      .select(
        `
        *,
        employees:employee_id(id, full_name, phone, employee_code)
      `,
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return ((data ?? []) as unknown as LeaveRequestRowWithEmployee[]).map(mapLeaveRequestRow);
  },

  async createLeaveRequest(profileId: string, values: LeaveFormValues) {
    const employee = await findEmployeeByProfileId(profileId);
    const { error } = await supabase.from('leave_requests').insert({
      profile_id: profileId,
      employee_id: employee?.id ?? null,
      leave_type: values.leave_type,
      start_date: values.start_date,
      end_date: values.end_date,
      reason: values.reason.trim(),
      medical_attachment_url: values.medical_attachment_url?.trim() || null,
      status: 'pending',
    });

    if (error) {
      throw error;
    }
  },

  async approveLeaveRequest(requestId: string) {
    const { error } = await supabase.rpc('approve_leave_request', { request_id: requestId });

    if (error) {
      throw error;
    }
  },

  async rejectLeaveRequest(requestId: string, note: string) {
    const { error } = await supabase.rpc('reject_leave_request', {
      request_id: requestId,
      note,
    });

    if (error) {
      throw error;
    }
  },

  async listRestDays(cycleYear: number, cycleMonth: number, regionId = '') {
    const { data, error } = await supabase.rpc('get_rest_day_calendar', {
      cycle_year: cycleYear,
      cycle_month: cycleMonth,
      region_filter: regionId || null,
    });

    if (error) {
      throw error;
    }

    return (data ?? []) as RestDayCalendarItem[];
  },

  async saveMyRestDays(cycleYear: number, cycleMonth: number, restDates: string[]) {
    const normalizedRestDates = [...new Set(restDates.map(toDateKey))].sort();

    console.info('save_my_rest_days request', {
      cycleYear,
      cycleMonth,
      normalizedDates: normalizedRestDates,
    });

    const { data, error } = await supabase.rpc('save_my_rest_days', {
      cycle_year: cycleYear,
      cycle_month: cycleMonth,
      rest_dates: normalizedRestDates,
    });

    console.info('save_my_rest_days response', {
      data,
      error,
    });

    if (error) {
      throw error;
    }

    return data;
  },

  async autoFillRestDays(cycleYear: number, cycleMonth: number, regionId = '') {
    const { data, error } = await supabase.rpc('auto_fill_rest_days', {
      cycle_year: cycleYear,
      cycle_month: cycleMonth,
      region_filter: regionId || null,
    });

    if (error) {
      throw error;
    }

    return data ?? 0;
  },
};

export function getLeaveStats(requests: LeaveRequestItem[]): LeaveStats {
  return requests.reduce<LeaveStats>(
    (stats, request) => {
      stats.total += 1;
      stats[request.status] += 1;
      return stats;
    },
    {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    },
  );
}

async function findEmployeeByProfileId(profileId: string) {
  const { data, error } = await supabase
    .from('employees')
    .select('id')
    .eq('profile_id', profileId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

function mapLeaveRequestRow(row: LeaveRequestRowWithEmployee): LeaveRequestItem {
  return {
    ...row,
    employee: row.employees,
  };
}

function toDateKey(date: string) {
  return date.slice(0, 10);
}
