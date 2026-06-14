import { supabase } from '../lib/supabase';

export type RegisterPayload = {
  fullName: string;
  nickname: string;
  gender: string;
  birthday: string;
  identityNumber: string;
  phone?: string;
  email: string;
  password: string;
  regionCode: string;
};

export const authService = {
  getSession() {
    return supabase.auth.getSession();
  },
  signIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  },
  resetPasswordForEmail(email: string) {
    const redirectTo = `${window.location.origin}/reset-password`;
    return supabase.auth.resetPasswordForEmail(email, { redirectTo });
  },
  updatePassword(password: string) {
    return supabase.auth.updateUser({ password });
  },
  signUp(payload: RegisterPayload) {
    return supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          full_name: payload.fullName,
          nickname: payload.nickname,
          gender: payload.gender,
          birthday: payload.birthday,
          identity_number: payload.identityNumber,
          phone: payload.phone ?? '',
          region_code: payload.regionCode,
        },
      },
    });
  },
  signOut() {
    return supabase.auth.signOut();
  },
};
