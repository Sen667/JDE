import { useEffect } from 'react';
import { authAPI } from '@/integrations/laravel/api';
import { useAuthStore, Profile, UserRole, World } from '@/lib/store';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Types for Laravel authentication
interface LaravelUser {
  id: string;
  email: string;
  name: string;
  roles?: string[];
  worlds?: any[];
}

interface LaravelSession {
  access_token: string;
  refresh_token?: string | null;
  expires_in?: number | null;
  token_type?: string;
  user?: LaravelUser;
}

export const useAuth = () => {
  const navigate = useNavigate();
  const {
    setUser,
    setSession,
    setProfile,
    setRoles,
    setAccessibleWorlds,
    user,
    session,
  } = useAuthStore();

  useEffect(() => {
    const checkAuth = () => {
      const currentPath = window.location.pathname;
      const isOnAuthPage =
        currentPath.includes('/auth') ||
        currentPath.includes('/login') ||
        currentPath.includes('/register');

      if (isOnAuthPage) {
        console.log('useAuth: Skipping session validation on auth page');
        setSession(null);
        setUser(null);
        setProfile(null);
        setRoles([]);
        setAccessibleWorlds([]);
        return;
      }

      const token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('user_data');

      if (token && userData) {
        try {
          // Restore user from localStorage only - Token-Only Authentication approach
          const storedUser: LaravelUser = JSON.parse(userData);

          // Map Laravel user data to store expected types
          const profile: Profile = {
            id: storedUser.id,
            email: storedUser.email,
            display_name: storedUser.name,
            avatar_url: null, // Laravel doesn't provide this
          };

          const roles: UserRole[] = (storedUser.roles || []).map((role: string) => ({
            role: role.startsWith('/') ? 'viewer' : role as 'superadmin' | 'admin' | 'editor' | 'viewer'
          }));

          const worlds: World[] = (storedUser.worlds || []).map((world: any) => ({
            id: world.id || world,
            code: world.code || world,
            name: world.name || world.code || world,
            description: world.description || '',
            theme_colors: world.theme_colors || {
              primary: '#007bff',
              accent: '#6c757d',
              neutral: '#f8f9fa'
            }
          }));

          setUser(null); // Laravel doesn't use Supabase User type
          setSession({ access_token: token, refresh_token: null, expires_in: null });
          setProfile(profile);
          setRoles(roles);
          setAccessibleWorlds(worlds);

          // Set axios global header for token authentication
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          console.log('useAuth: Restored authentication from localStorage - Token-Only Authentication enabled');
        } catch (error) {
          console.error('useAuth: Failed to parse stored user data', error);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
          setSession(null);
          setUser(null);
          setProfile(null);
          setRoles([]);
          setAccessibleWorlds([]);
        }
      } else {
        // No stored session
        setSession(null);
        setUser(null);
        setProfile(null);
        setRoles([]);
        setAccessibleWorlds([]);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);

      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user_data', JSON.stringify(response.user));

      axios.defaults.headers.common['Authorization'] = `Bearer ${response.token}`;

      // Map Laravel data to store types
      const profile: Profile = {
        id: response.user.id,
        email: response.user.email,
        display_name: response.user.name,
        avatar_url: null,
      };

      const roles: UserRole[] = (response.user.roles || []).map((role: string) => ({
        role: role.startsWith('/') ? 'viewer' : role as 'superadmin' | 'admin' | 'editor' | 'viewer'
      }));

      const worlds: World[] = (response.user.worlds || []).map((world: any) => ({
        id: world.id || world,
        code: world.code || world,
        name: world.name || world.code || world,
        description: world.description || '',
        theme_colors: world.theme_colors || {
          primary: '#007bff',
          accent: '#6c757d',
          neutral: '#f8f9fa'
        }
      }));

      setUser(null); // Laravel doesn't use Supabase User type
      setSession({ access_token: response.token, refresh_token: null, expires_in: null });
      setProfile(profile);
      setRoles(roles);
      setAccessibleWorlds(worlds);

      navigate('/');
    } catch (error) {
      console.error('Login failed', error);
      throw error;
    }
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    world?: string;
  }) => {
    try {
      const response = await authAPI.register(data);

      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user_data', JSON.stringify(response.user));

      axios.defaults.headers.common['Authorization'] = `Bearer ${response.token}`;

      // Map Laravel data to store types
      const profile: Profile = {
        id: response.user.id,
        email: response.user.email,
        display_name: response.user.name,
        avatar_url: null,
      };

      const roles: UserRole[] = (response.user.roles || []).map((role: string) => ({
        role: role.startsWith('/') ? 'viewer' : role as 'superadmin' | 'admin' | 'editor' | 'viewer'
      }));

      const worlds: World[] = (response.user.worlds || []).map((world: any) => ({
        id: world.id || world,
        code: world.code || world,
        name: world.name || world.code || world,
        description: world.description || '',
        theme_colors: world.theme_colors || {
          primary: '#007bff',
          accent: '#6c757d',
          neutral: '#f8f9fa'
        }
      }));

      setUser(null); // Laravel doesn't use Supabase User type
      setSession({ access_token: response.token, refresh_token: null, expires_in: null });
      setProfile(profile);
      setRoles(roles);
      setAccessibleWorlds(worlds);

      navigate('/');
    } catch (error) {
      console.error('Registration failed', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      setUser(null);
      setSession(null);
      setProfile(null);
      setRoles([]);
      setAccessibleWorlds([]);
      navigate('/auth/login');
    }
  };

  return {
    login,
    register,
    logout,
    user,
    session,
  };
};
