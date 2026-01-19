import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';

export interface World {
  id: string;
  code: 'JDE' | 'JDMO' | 'DBCS';
  name: string;
  description: string;
  theme_colors: {
    primary: string;
    accent: string;
    neutral: string;
  };
}

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface UserRole {
  role: 'super-admin' | 'admin' | 'editor' | 'viewer';
}

interface AuthState {
  user: User | null;
  session: Session | { access_token: string; refresh_token?: string | null; expires_in?: number | null } | null;
  profile: Profile | null;
  roles: UserRole[];
  accessibleWorlds: World[];
  currentWorld: World | null;
  setUser: (user: User | null) => void;
  setSession: (session: Session | { access_token: string; refresh_token?: string | null; expires_in?: number | null } | null) => void;
  setProfile: (profile: Profile | null) => void;
  setRoles: (roles: UserRole[]) => void;
  setAccessibleWorlds: (worlds: World[]) => void;
  setCurrentWorld: (world: World | null) => void;
  isSuperAdmin: () => boolean;
  hasWorldAccess: (worldCode: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  roles: [],
  accessibleWorlds: [],
  currentWorld: null,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setRoles: (roles) => set({ roles }),
  setAccessibleWorlds: (worlds) => set({ accessibleWorlds: worlds }),
  setCurrentWorld: (world) => set({ currentWorld: world }),
  isSuperAdmin: () => {
    const { roles } = get();
    return roles.some(r => r.role === 'super-admin');
  },
  hasWorldAccess: (worldCode: string) => {
    const { accessibleWorlds } = get();
    return accessibleWorlds.some(w => w.code === worldCode);
  },
  logout: () => set({
    user: null,
    session: null,
    profile: null,
    roles: [],
    accessibleWorlds: [],
    currentWorld: null,
  }),
}));
