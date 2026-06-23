import { supabase } from '../lib/supabase';
import type { Employee, LeaveRequest, LeaveRequestStatus, LeaveType } from '../types/database';

export type LeaveFormValues = {
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
  medical_attachment_url?: string;
};

const MEDICAL_BUCKET = 'leave-medical-attachments';

export type LeaveRequestItem = LeaveRequest & {
  employee: Pick<Employee, 'id' | 'full_name' | 'phone' | 'employee_code'> | null;
};

export type LeaveStats = Record<LeaveRequestStatus | 'total', number>;

export type LeaveBalance = {
  annualRemaining: number;
  medicalRemaining: number;
};

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
    if (values.leave_type === 'replacement') {
      throw new Error('换休假已停用，不能提交新的换休申请。');
    }

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

  async uploadMedicalAttachment(profileId: string, file: File) {
    if (!file.type.startsWith('image/')) {
      throw new Error('病假证明必须是图片格式。');
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${profileId}/${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from(MEDICAL_BUCKET).upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage.from(MEDICAL_BUCKET).getPublicUrl(path);
    return data.publicUrl;
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

  async getMyLeaveBalances(profileId: string, requests?: LeaveRequestItem[]): Promise<LeaveBalance> {
    const employee = await findEmployeeByProfileId(profileId);
    const entitlement = calculateLeaveEntitlement(employee);
    const approvedRequests = requests ?? (await this.listMyLeaveRequests(profileId));
    const currentYear = new Date().getFullYear();

    const used = approvedRequests.reduce(
      (total, request) => {
        if (request.status !== 'approved') return total;
        if (request.leave_type !== 'annual' && request.leave_type !== 'medical') return total;

        const days = countLeaveDaysInYear(request.start_date, request.end_date, currentYear);
        return {
          ...total,
          [request.leave_type]: total[request.leave_type] + days,
        };
      },
      { annual: 0, medical: 0 },
    );

    return {
      annualRemaining: Math.max(0, entitlement.annual - used.annual),
      medicalRemaining: Math.max(0, entitlement.medical - used.medical),
    };
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
    .select('id, status, hire_date, probation_confirm_date')
    .eq('profile_id', profileId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

function calculateLeaveEntitlement(employee: Pick<Employee, 'status' | 'probation_confirm_date'> | null): {
  annual: number;
  medical: number;
} {
  if (!employee || employee.status !== 'active' || !employee.probation_confirm_date) {
    return { annual: 0, medical: 0 };
  }

  const today = new Date();
  const confirmDate = new Date(`${employee.probation_confirm_date}T00:00:00`);

  if (Number.isNaN(confirmDate.getTime()) || confirmDate > today) {
    return { annual: 0, medical: 0 };
  }

  const years = getCompletedYears(confirmDate, today);

  if (years < 2) {
    return { annual: 8, medical: 14 };
  }

  if (years < 5) {
    return { annual: 12, medical: 14 };
  }

  return {
    annual: Math.min(20, 16 + Math.max(0, years - 5)),
    medical: 14,
  };
}

function getCompletedYears(startDate: Date, endDate: Date) {
  let years = endDate.getFullYear() - startDate.getFullYear();
  const anniversary = new Date(endDate.getFullYear(), startDate.getMonth(), startDate.getDate());

  if (endDate < anniversary) {
    years -= 1;
  }

  return Math.max(0, years);
}

function countLeaveDaysInYear(startDate: string, endDate: string, year: number) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < yearStart || start > yearEnd) {
    return 0;
  }

  const effectiveStart = start < yearStart ? yearStart : start;
  const effectiveEnd = end > yearEnd ? yearEnd : end;
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / millisecondsPerDay) + 1;
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
