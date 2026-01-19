// Laravel API client - replaces src/integrations/supabase/client.ts
// This provides the same interface as the old Supabase client but uses the new axios-based API

import { authAPI, dossierAPI, worldAPI, userAPI, adminAPI, taskAPI, appointmentAPI } from './api';

// Type definitions to match Supabase interface
interface RequestOptions {
  headers?: Record<string, string>;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
}

interface ApiResponse<T> {
  data: T;
  error: any;
  status: number;
}

interface AuthResponse {
  data: {
    session: { access_token: string } | null;
    user: any;
  };
  error: any;
}

interface AuthMethods {
  signInWithPassword: (credentials: { email: string; password: string }) => Promise<AuthResponse>;
  signUp: (credentials: { email: string; password: string; name?: string }) => Promise<AuthResponse>;
  signOut: () => Promise<{ error: any }>;
  getSession: () => Promise<AuthResponse>;
  getUser: () => Promise<{ data: { user: any }; error: any }>;
}

// Main API client class that mimics Supabase interface
export class LaravelClient {
  private token: string | null = null;

  constructor() {
    // Get token from localStorage on initialization
    this.token = localStorage.getItem('auth_token');
  }

  setAuth(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearAuth() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }



  // Authentication methods (compatible with Supabase interface)
  auth: AuthMethods = {
    signInWithPassword: async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
      try {
        const result = await authAPI.login(credentials.email, credentials.password);
        this.setAuth(result.token);
        return { data: { session: { access_token: result.token }, user: result.user }, error: null };
      } catch (error: any) {
        throw new Error(error?.response?.data?.message || 'Login failed');
      }
    },

    signUp: async (credentials: { email: string; password: string; name?: string }): Promise<AuthResponse> => {
      try {
        const result = await authAPI.register({
          name: credentials.name || '',
          email: credentials.email,
          password: credentials.password,
          password_confirmation: credentials.password
        });
        this.setAuth(result.token);
        return { data: { session: { access_token: result.token }, user: result.user }, error: null };
      } catch (error: any) {
        throw new Error(error?.response?.data?.message || 'Registration failed');
      }
    },

    signOut: async (): Promise<{ error: any }> => {
      try {
        await authAPI.logout();
        this.clearAuth();
        return { error: null };
      } catch (error: any) {
        // Still clear auth even if logout fails
        this.clearAuth();
        return { error: null };
      }
    },

    getSession: async (): Promise<AuthResponse> => {
      if (!this.token) {
        return { data: { session: null, user: null }, error: null };
      }

      try {
        const result = await authAPI.getUser();
        return {
          data: {
            session: { access_token: this.token },
            user: result
          },
          error: null
        };
      } catch (error: any) {
        this.clearAuth();
        return { data: { session: null, user: null }, error: null };
      }
    },

    getUser: async (): Promise<{ data: { user: any }; error: any }> => {
      try {
        const result = await authAPI.getUser();
        return { data: { user: result }, error: null };
      } catch (error: any) {
        return { data: { user: null }, error: error?.response?.data || error };
      }
    },
  };

  // Database methods - mimic Supabase syntax
  from(table: string) {
    let queryParams = new URLSearchParams();

    const resetQuery = () => {
      queryParams = new URLSearchParams();
    };

    return {
      select: (columns: string = '*') => {
        queryParams.set('columns', columns);

        const queryBuilder = {
          eq: (column: string, value: any) => {
            queryParams.set(column, value);

            return {
              order: (column: string, options?: { ascending?: boolean }) => {
                const direction = options?.ascending === false ? 'desc' : 'asc';
                queryParams.set('order_by', column);
                queryParams.set('order_direction', direction);

                return {
                  limit: (count: number) => {
                    queryParams.set('limit', count.toString());
                    const url = `/${table}?${queryParams.toString()}`;
                    return this.request('GET', url);
                  },
                  single: async () => {
                    const response = await this.request('GET', `/${table}?${queryParams.toString()}`);
                    return {
                      data: response.data?.[0] || null,
                      error: response.error,
                    };
                  },
                };
              },

              limit: (count: number) => {
                queryParams.set('limit', count.toString());

                return {
                  single: async () => {
                    const response = await this.request('GET', `/${table}?${queryParams.toString()}`);
                    return {
                      data: response.data?.[0] || null,
                      error: response.error,
                    };
                  },
                };
              },

              single: async () => {
                const response = await this.request('GET', `/${table}?${queryParams.toString()}`);
                return {
                  data: response.data?.[0] || null,
                  error: response.error,
                };
              },
            };
          },

          order: (column: string, options?: { ascending?: boolean }) => {
            const direction = options?.ascending === false ? 'desc' : 'asc';
            queryParams.set('order_by', column);
            queryParams.set('order_direction', direction);

            return {
              then: async () => {
                return this.request('GET', `/${table}?${queryParams.toString()}`);
              },
            };
          },

          // Generic select
          then: (async () => {
            resetQuery();
            return this.request('GET', `/${table}`);
          }) as any,
        };

        return queryBuilder;
      },

      insert: (data: any | any[]) => {
        return {
          select: (columns?: string) => this.request('POST', `/${table}`, { body: Array.isArray(data) ? data[0] : data }),
          then: (async () => {
            return this.request('POST', `/${table}`, { body: Array.isArray(data) ? data[0] : data });
          }) as any,
        };
      },

      update: (data: any) => {
        return {
          eq: (column: string, value: any) => {
            return this.request('PUT', `/${table}/${value}`, { body: data });
          },
          then: (async () => {
            throw new Error('Update requires eq() filter');
          }) as any,
        };
      },

      delete: () => {
        return {
          eq: (column: string, value: any) => {
            return this.request('DELETE', `/${table}/${value}`);
          },
          then: (async () => {
            throw new Error('Delete requires eq() filter');
          }) as any,
        };
      },
    };
  }

  // Real-time subscriptions (placeholder - will implement with Laravel Broadcasting)
  channel(name: string) {
    return {
      on: (event: string, callback: Function) => {
        // Placeholder for real-time implementation
        console.log(`Real-time subscription for ${name}:${event} - not yet implemented`);
        return this;
      },
      subscribe: () => {
        // Placeholder
        return this;
      },
    };
  }
}

// Export singleton instance
export const laravelClient = new LaravelClient();

// Named export for compatibility
export { laravelClient as supabase };
