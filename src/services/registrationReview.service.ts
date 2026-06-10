import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';

export type PendingRegistration = Pick<
  Profile,
  'id' | 'email' | 'full_name' | 'phone' | 'status' | 'review_note' | 'created_at'
>;

export type RegistrationApprovalValues = {
  region_id: string;
  employment_type_id: string;
  job_title_id: string;
  hire_date: string;
  start_work_time: string;
  end_work_time: string;
};

export const registrationReviewService = {
  async listPendingRegistrations() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone, status, review_note, created_at')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []) as PendingRegistration[];
  },

  async approveRegistration(profileId: string, values: RegistrationApprovalValues) {
    const { error } = await supabase.rpc('approve_registration_with_employee', {
      profile_id: profileId,
      region_id: values.region_id,
      employment_type_id: values.employment_type_id,
      job_title_id: values.job_title_id,
      hire_date: values.hire_date,
      start_work_time: values.start_work_time,
      end_work_time: values.end_work_time,
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
