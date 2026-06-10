import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from './database';

export type AuthState = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
};
