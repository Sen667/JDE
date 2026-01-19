import axios, { AxiosError } from 'axios';

// Laravel API base URL - configure based on your setup
const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Create axios instance with default configuration
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 10000,
  // Ensure form data is properly serialized
  transformRequest: [(data, headers) => {
    // Debug: log what we're sending
    console.log('Axios transformRequest - sending data:', data);
    return JSON.stringify(data);
  }],
});

// Add request interceptor to debug what's being sent
api.interceptors.request.use((config) => {
  console.log('API Request Debug:', {
    url: config.url,
    method: config.method,
    data: config.data,
    headers: config.headers
  });
  return config;
});

// Add authentication token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle authentication errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      const isAuthRoute = error.config.url?.includes('/auth') ?? false;
      const isUserRoute = error.config.url?.includes('/user') ?? false;

      // CRITICAL: Don't auto-logout on /user route - let useAuth hook handle it
      if (isUserRoute) {
        console.log('User route 401 error - letting useAuth hook handle session validation');
        return Promise.reject(error); // Don't logout, pass error to caller
      }

      // Only logout for other auth failures or when explicitly no token
      const token = localStorage.getItem('auth_token');
      if (!token && !isAuthRoute) {
        console.warn('No auth token but trying authenticated route - redirecting to login');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        window.location.href = '/auth/login';
      }
      // For permission errors (world access, etc.), don't logout - just return the error
    }
    return Promise.reject(error);
  }
);

// Set global authorization header on token changes
const updateAuthHeader = () => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    // Use axios defaults for global header setting
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('Global auth header updated');
  } else {
    // Clear global header when no token
    delete axios.defaults.headers.common['Authorization'];
  }
};

// Initial setup
updateAuthHeader();

// API response types
export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

// Authentication API functions
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (data: { name: string; email: string; password: string; password_confirmation: string; world?: string }) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  getUser: async () => {
    const response = await api.get('/user');
    return response.data;
  },

  updateProfile: async (data: any) => {
    const response = await api.put('/profile', data);
    return response.data;
  },
};

// World API functions
export const worldAPI = {
  getWorlds: async () => {
    const response = await api.get('/worlds');
    return response.data;
  },

  getWorld: async (worldId: string) => {
    const response = await api.get(`/worlds/${worldId}`);
    return response.data;
  },

  getWorldDossiers: async (worldId: string, params?: { page?: number; status?: string; search?: string }) => {
    const response = await api.get(`/worlds/${worldId}/dossiers`, { params });
    return response.data;
  },

  getWorldUsers: async (worldCode: string) => {
    const response = await api.get(`/worlds/${worldCode}/users`);
    return response.data;
  },
};

// Dossier API functions
export const dossierAPI = {
  getDossiers: async (params?: { page?: number; world?: string; status?: string; search?: string }) => {
    const response = await api.get('/dossiers', { params });
    return response.data;
  },

  getDossier: async (dossierId: string) => {
    const response = await api.get(`/dossiers/${dossierId}?with_details=1`);
    return response.data;
  },

  createDossier: async (data: { world_id: string; title: string; tags?: string[] }) => {
    const response = await api.post('/dossiers', data);
    return response.data;
  },

  updateDossier: async (dossierId: string, data: { title?: string; status?: string; tags?: string[] }) => {
    const response = await api.put(`/dossiers/${dossierId}`, data);
    return response.data;
  },

  deleteDossier: async (dossierId: string) => {
    const response = await api.delete(`/dossiers/${dossierId}`);
    return response.data;
  },

  updateClientInfo: async (dossierId: string, data: any) => {
    const response = await api.post(`/dossiers/${dossierId}/client-info`, data);
    return response.data;
  },

  getWorkflow: async (dossierId: string) => {
    const response = await api.get(`/dossiers/${dossierId}/workflow`);
    return response.data;
  },

  getWorkflowOverview: async (dossierId: string) => {
    const response = await api.get(`/dossiers/${dossierId}/workflow/overview`);
    return response.data;
  },

  getWorkflowHistory: async (dossierId: string) => {
    const response = await api.get(`/dossiers/${dossierId}/workflow/history`);
    return response.data;
  },

  getTimeline: async (dossierId: string) => {
    const response = await api.get(`/dossiers/${dossierId}/timeline`);
    return response.data;
  },

  completeWorkflowStep: async (dossierId: string, data: { step_id: string; decision?: boolean; notes?: string; form_data?: any }) => {
    const response = await api.post(`/dossiers/${dossierId}/workflow/complete-step`, data);
    return response.data;
  },

  saveWorkflowFormData: async (data: { dossier_id: string; workflow_step_id: string; form_data?: any }) => {
    const { form_data, ...rest } = data;

    // Check if form_data is FormData (contains files)
    if (form_data instanceof FormData) {
      // Add the other fields to FormData
      Object.keys(rest).forEach(key => {
        form_data.append(key, rest[key]);
      });

      const response = await api.post('/dossiers/workflow/save-form-data', form_data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        // Don't transform FormData to JSON
        transformRequest: [(data) => data],
        // Increase timeout for file uploads
        timeout: 300000, // 5 minutes timeout for file uploads
      });
      return response.data;
    } else {
      // Regular JSON data
      const response = await api.post('/dossiers/workflow/save-form-data', {
        ...rest,
        form_data
      });
      return response.data;
    }
  },

  getClientInfo: async (dossierId: string) => {
    const response = await api.get(`/dossiers/${dossierId}/client-info`);
    return response.data;
  },

  getAttachments: async (dossierId: string) => {
    const response = await api.get(`/dossiers/${dossierId}/attachments`);
    return response.data;
  },

  uploadAttachment: async (dossierId: string, formData: FormData) => {
    const response = await api.post(`/dossiers/${dossierId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // Don't transform FormData to JSON
      transformRequest: [(data) => data],
      // Increase timeout for large file uploads (50MB audio files can take time)
      timeout: 300000, // 5 minutes timeout for file uploads
    });
    return response.data;
  },

  deleteAttachment: async (dossierId: string, attachmentId: string) => {
    const response = await api.delete(`/dossiers/${dossierId}/attachments/${attachmentId}`);
    return response.data;
  },

  downloadAttachment: async (dossierId: string, attachmentId: string) => {
    const response = await api.get(`/dossiers/${dossierId}/attachments/${attachmentId}/download`, {
      responseType: 'blob',
    });
    return response;
  },

  previewAttachment: async (dossierId: string, attachmentId: string) => {
    const response = await api.get(`/dossiers/${dossierId}/attachments/${attachmentId}/preview`, {
      responseType: 'blob',
    });
    return response;
  },

  addComment: async (dossierId: string, data: { comment: string; comment_type?: string }) => {
    const response = await api.post(`/dossiers/${dossierId}/comments`, data);
    return response.data;
  },

  getComments: async (dossierId: string) => {
    const response = await api.get(`/dossiers/${dossierId}/comments`);
    return response.data;
  },

  getTransferHistory: async (dossierId: string) => {
    const response = await api.get(`/transfers/history/${dossierId}`);
    return response.data;
  },

  checkTransferEligibility: async (data: { dossier_id: string; target_world: string }) => {
    const response = await api.get('/transfers/check-eligibility', { params: data });
    return response.data;
  },

  initiateTransfer: async (data: { dossier_id: string; target_world: string }) => {
    const response = await api.post('/transfers/initiate', data);
    return response.data;
  },

  getDossierTransferHistory: async (dossierId: string) => {
    const response = await api.get(`/dossiers/${dossierId}/transfers`);
    return response.data;
  },

  createDossierTask: async (dossierId: string, data: {
    title: string;
    description?: string;
    priority: string;
    assigned_to?: string;
    due_date?: string;
    workflow_step_id?: string;
    create_appointment?: boolean
  }) => {
    const response = await api.post(`/dossiers/${dossierId}/tasks`, data);
    return response.data;
  },

  getDossierTasks: async (dossierId: string) => {
    const response = await api.get(`/dossiers/${dossierId}/tasks`);
    return response.data;
  },

  // Workflow Rollback API functions
  rollbackWorkflowStep: async (dossierId: string, stepId: string, data: { reason: string }) => {
    const response = await api.post(`/dossiers/${dossierId}/workflow/${stepId}/rollback-step`, data);
    return response.data;
  },

  canRollbackStep: async (dossierId: string, stepId: string) => {
    const response = await api.get(`/dossiers/${dossierId}/workflow/${stepId}/can-rollback`);
    return response.data;
  },

  getStepRollbackHistory: async (dossierId: string, stepId: string) => {
    const response = await api.get(`/dossiers/${dossierId}/workflow/${stepId}/rollback-history`);
    return response.data;
  },
};

// Task API functions
export const taskAPI = {
  getTasks: async (params?: { status?: string; assigned_to?: string }) => {
    const response = await api.get('/tasks', { params });
    return response.data;
  },

  getMyTasks: async (params?: { status?: string }) => {
    const response = await api.get('/my-tasks', { params });
    return response.data;
  },

  getTask: async (taskId: string) => {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data;
  },

  createTask: async (data: any) => {
    const response = await api.post('/tasks', data);
    return response.data;
  },

  updateTask: async (taskId: string, data: any) => {
    const response = await api.put(`/tasks/${taskId}`, data);
    return response.data;
  },

  updateTaskStatus: async (taskId: string, status: string) => {
    const response = await api.put(`/tasks/${taskId}/status`, { status });
    return response.data;
  },

  deleteTask: async (taskId: string) => {
    const response = await api.delete(`/tasks/${taskId}`);
    return response.data;
  },
};

// Appointment API functions
export const appointmentAPI = {
  getAppointments: async (params?: { page?: number; start_date?: string; end_date?: string }) => {
    const response = await api.get('/appointments', { params });
    return response.data;
  },

  getMyAppointments: async (params?: { status?: string }) => {
    const response = await api.get('/my-appointments', { params });
    return response.data;
  },

  getAppointment: async (appointmentId: string) => {
    const response = await api.get(`/appointments/${appointmentId}`);
    return response.data;
  },

  createAppointment: async (data: any) => {
    const response = await api.post('/appointments', data);
    return response.data;
  },

  updateAppointment: async (appointmentId: string, data: any) => {
    const response = await api.put(`/appointments/${appointmentId}`, data);
    return response.data;
  },

  updateAppointmentStatus: async (appointmentId: string, status: string) => {
    const response = await api.put(`/appointments/${appointmentId}/status`, { status });
    return response.data;
  },

  deleteAppointment: async (appointmentId: string) => {
    const response = await api.delete(`/appointments/${appointmentId}`);
    return response.data;
  },
};

// User API functions
export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/profile');
    return response.data;
  },

  updateProfile: async (data: any) => {
    const response = await api.put('/profile', data);
    return response.data;
  },
};

// Notification API functions
export const notificationAPI = {
  getNotifications: async (params?: { page?: number; per_page?: number }) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  getNotification: async (notificationId: string) => {
    const response = await api.get(`/notifications/${notificationId}`);
    return response.data;
  },

  createNotification: async (data: {
    user_id: string;
    title: string;
    message: string;
    type: 'task' | 'appointment' | 'system' | 'dossier';
    related_id?: string; // UUID format
  }) => {
    const response = await api.post('/notifications', data);
    return response.data;
  },

  markAsRead: async (notificationId: string) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.post('/notifications/mark-all-read');
    return response.data;
  },

  deleteNotification: async (notificationId: string) => {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },

  debugTable: async () => {
    const response = await api.get('/notifications/debug');
    return response.data;
  },
};

// Specialized UnifiedTasksPanel API methods
export const unifiedTasksAPI = {
  getFilteredTasks: async (params?: {
    priority?: string;
    per_page?: number;
  }) => {
    const response = await api.get('/tasks', { params });
    return response.data;
  },

  updateTaskStatus: async (taskId: string, status: string) => {
    const response = await api.put(`/tasks/${taskId}/status`, { status });
    return response.data;
  },

  deleteTask: async (taskId: string) => {
    const response = await api.delete(`/tasks/${taskId}`);
    return response.data;
  },
};

export const unifiedAppointmentsAPI = {
  getFilteredAppointments: async (params?: {
    status?: string;
    start_date?: string;
    end_date?: string;
    per_page?: number;
  }) => {
    const response = await api.get('/appointments', { params });
    return response.data;
  },
};

// Admin API functions
export const roleAPI = {
  getRoles: async () => {
    const response = await api.get('/roles');
    return response.data;
  },

  getPermissions: async () => {
    const response = await api.get('/permissions');
    return response.data;
  },

  createRole: async (data: { name: string; display_name?: string}) => {
    const response = await api.post('/admin/roles', data);
    return response.data;
  },

  updateRole: async (roleId: string, data: { name?: string; display_name?: string; permissions?: string[] }) => {
    const response = await api.put(`/admin/roles/${roleId}`, data);
    return response.data;
  },

  deleteRole: async (roleId: string) => {
    const response = await api.delete(`/admin/roles/${roleId}`);
    return response.data;
  },
};

export const adminAPI = {
  getUsers: async (params?: { page?: number; role?: string }) => {
    console.log('Making API call to /admin/users');
    const response = await api.get('/admin/users', { params });
    console.log('Full axios response:', response);
    console.log('Response data property:', response.data);
    return response.data;
  },

  createUser: async (data: any) => {
    const response = await api.post('/admin/users', data);
    return response.data;
  },

  updateUser: async (userId: string, data: any) => {
    const response = await api.put(`/admin/users/${userId}`, data);
    return response.data;
  },

  updateUserRole: async (userId: string, roleId: string) => {
    const response = await api.put(`/admin/users/${userId}/role`, { role_id: roleId });
    return response.data;
  },

  updateUserWorldAccess: async (userId: string, worldIds: string[]) => {
    const response = await api.put(`/admin/users/${userId}/world-access`, { world_ids: worldIds });
    return response.data;
  },

  deleteUser: async (userId: string) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },

  getAnalytics: async () => {
    const response = await api.get('/admin/analytics');
    return response.data;
  },

  getAuditLogs: async (params?: { page?: number; user_id?: string; action?: string }) => {
    const response = await api.get('/admin/audit-logs', { params });
    return response.data;
  },

  getUsersWithWorldAccess: async () => {
    const response = await api.get('/admin/users/with-world-access');
    return response.data;
  },

  addUserWorldAccess: async (userId: string, worldId: string) => {
    const response = await api.post(`/admin/users/${userId}/world-access/${worldId}`);
    return response.data;
  },

  removeUserWorldAccess: async (userId: string, worldId: string) => {
    const response = await api.delete(`/admin/users/${userId}/world-access/${worldId}`);
    return response.data;
  },

  getClients: async (params?: { page?: number; search?: string }) => {
    const response = await api.get('/clients', { params });
    return response.data;
  },

  getClient: async (clientId: string) => {
    const response = await api.get(`/clients/${clientId}`);
    return response.data;
  },

  createClient: async (data: any) => {
    const response = await api.post('/clients', data);
    return response.data;
  },

  updateClient: async (clientId: string, data: any) => {
    const response = await api.put(`/clients/${clientId}`, data);
    return response.data;
  },

  deleteClient: async (clientId: string) => {
    const response = await api.delete(`/clients/${clientId}`);
    return response.data;
  },

  getMyClients: async (params?: { page?: number }) => {
    const response = await api.get('/my-clients', { params });
    return response.data;
  },
};

// Export default axios instance
export default api;
