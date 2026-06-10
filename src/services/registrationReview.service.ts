import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';

export type PendingRegistration = Pick<
  Profile,
  'id' | 'email' | 'full_name' | 'phone' | 'status' | 'review_note' | 'created_at'
>;

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

  async approveRegistration(profileId: string) {
    const { error } = await supabase.rpc('approve_registration', { profile_id: profileId });

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
