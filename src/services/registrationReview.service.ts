import { supabase } from '../lib/supabase';
import type { EmployeeStatus, Profile, Region } from '../types/database';

export type PendingRegistration = Pick<
  Profile,
  | 'id'
  | 'email'
  | 'full_name'
  | 'nickname'
  | 'phone'
  | 'gender'
  | 'birthday'
  | 'identity_number'
  | 'region_id'
  | 'status'
  | 'review_note'
  | 'created_at'
> & {
  region: Pick<Region, 'id' | 'code' | 'name'> | null;
};

export type RegistrationApprovalValues = {
  employment_type_id: string;
  job_title_id: string;
  employee_status: EmployeeStatus;
  hire_date: string;
  start_work_time: string;
  end_work_time: string;
  require_attendance: boolean;
  base_salary: string;
};

export const registrationReviewService = {
  async listPendingRegistrations() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, nickname, phone, gender, birthday, identity_number, region_id, status, review_note, created_at')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as Omit<PendingRegistration, 'region'>[];
    const regionMap = await getRegionMap(rows);

    return rows.map((registration) => ({
      ...registration,
      region: registration.region_id ? regionMap.get(registration.region_id) ?? null : null,
    }));
  },

  async approveRegistration(profileId: string, values: RegistrationApprovalValues) {
    const { error } = await supabase.rpc('approve_registration_with_employee', {
      profile_id: profileId,
      employment_type_id: values.employment_type_id,
      job_title_id: values.job_title_id,
      employee_status: values.employee_status,
      hire_date: values.hire_date,
      start_work_time: values.start_work_time,
      end_work_time: values.end_work_time,
      require_attendance: values.require_attendance,
      base_salary: values.base_salary.trim() ? Number(values.base_salary) : null,
    });

    if (error) {
      throw error;
    }
  },

  async rejectRegistration(profileId: string, note: string) {
    const { error } = await supabase.rpc('reject_registration', {
      profile_id: profileId,
      note,
    });

    if (error) {
      throw error;
    }
  },
};

async function getRegionMap(rows: Array<{ region_id: string | null }>) {
  const regionIds = Array.from(new Set(rows.map((row) => row.region_id).filter(Boolean))) as string[];
  if (regionIds.length === 0) return new Map<string, Pick<Region, 'id' | 'code' | 'name'>>();

  const { data, error } = await supabase.from('regions').select('id, code, name').in('id', regionIds);

  if (error) {
    throw error;
  }

  return new Map((data ?? []).map((region) => [region.id, region]));
}
