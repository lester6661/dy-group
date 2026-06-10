import { useEffect, useState } from 'react';
import type { AuthState } from '../types/auth';
import { supabase } from '../lib/supabase';

const initialState: AuthState = {
  user: null,
  session: null,
  profile: null,
  loading: true,
};

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(initialState);

  useEffect(() => {
    let mounted = true;

    async function loadAuthState() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      const profile = user ? await fetchProfile(user.id) : null;

      if (mounted) {
        setAuthState({
          user,
          session: data.session,
          profile,
          loading: false,
        });
      }
    }

    loadAuthState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      const profile = user ? await fetchProfile(user.id) : null;

      if (mounted) {
        setAuthState({
          user,
          session,
          profile,
          loading: false,
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return authState;
}

async function fetchProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

  if (error) {
    console.warn('读取用户资料失败。', error.message);
    return null;
  }

  return data;
}
