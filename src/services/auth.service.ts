import { supabase } from '../lib/supabase';

export type RegisterPayload = {
  fullName: string;
  phone?: string;
  email: string;
  password: string;
};

export const authService = {
  getSession() {
    return supabase.auth.getSession();
  },
  signIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  },
  signUp(payload: RegisterPayload) {
    return supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          full_name: payload.fullName,
          phone: payload.phone ?? '',
        },
      },
    });
  },
  signOut() {
    return supabase.auth.signOut();
  },
};
