const API_BASE = (import.meta.env.VITE_API_BASE as string) || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/api/v1' : 'https://dd-restaurants-app.onrender.com/api/v1');

export class ApiError extends Error {
  constructor(public message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('dd_admin_token');
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new ApiError(data.error || `HTTP ${res.status}: Request failed`, res.status);
    }

    return data;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || 'Failed to connect to Daily Drop server. Is the API server running?');
  }
}

export const adminApi = {
  // Auth
  login: async (email: string, password: string) => {
    return request<{ success: boolean; token: string; user: any; restaurant: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  getMe: async () => {
    return request<{ success: boolean; user: any; restaurant: any }>('/auth/me');
  },

  forgotPassword: async (email: string) => {
    return request<{ success: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // Dashboard
  getDashboardMetrics: async () => {
    return request<{ success: boolean; data: any }>('/admin/dashboard/metrics');
  },

  // Restaurants
  getRestaurants: async (params?: { search?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    return request<{ success: boolean; data: any[] }>(`/admin/restaurants?${query.toString()}`);
  },

  createRestaurant: async (data: {
    name: string;
    ownerName: string;
    email: string;
    phone: string;
    address?: string;
    notes?: string;
    sendInvite: boolean;
  }) => {
    return request<{ success: boolean; data: any }>('/admin/restaurants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateRestaurant: async (id: string, data: any) => {
    return request<{ success: boolean; message: string }>(`/admin/restaurants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  sendInvitation: async (restaurantId: string) => {
    return request<{ success: boolean; message: string; invitationUrl: string }>(`/admin/restaurants/${restaurantId}/invite`, {
      method: 'POST',
    });
  },

  toggleRestaurantStatus: async (restaurantId: string, status: 'active' | 'suspended') => {
    return request<{ success: boolean; message: string }>(`/admin/restaurants/${restaurantId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // Live Orders Monitor & Driver Handover
  getOrders: async (params?: { restaurantId?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.restaurantId) query.append('restaurantId', params.restaurantId);
    if (params?.status) query.append('status', params.status);
    return request<{ success: boolean; data: any[]; counts: Record<string, number> }>(`/admin/orders?${query.toString()}`);
  },

  confirmDriverPickup: async (orderId: string, driverName?: string) => {
    return request<{ success: boolean; message: string; data: any }>(`/admin/orders/${orderId}/confirm-driver-pickup`, {
      method: 'POST',
      body: JSON.stringify({ driverName }),
    });
  },

  // Updates
  getUpdates: async (params?: { status?: string; priority?: string; category?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.priority) query.append('priority', params.priority);
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    return request<{ success: boolean; data: any[] }>(`/admin/updates?${query.toString()}`);
  },

  getUpdateDetail: async (id: string) => {
    return request<{ success: boolean; data: any }>(`/admin/updates/${id}`);
  },

  createUpdate: async (data: any) => {
    return request<{ success: boolean; data: any }>('/admin/updates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  uploadAttachments: async (updateId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach(f => formData.append('attachments', f));
    return request<{ success: boolean; data: any[] }>(`/admin/updates/${updateId}/attachments`, {
      method: 'POST',
      body: formData,
    });
  },

  publishUpdate: async (id: string) => {
    return request<{ success: boolean; message: string }>(`/admin/updates/${id}/publish`, {
      method: 'POST',
    });
  },

  archiveUpdate: async (id: string) => {
    return request<{ success: boolean; message: string }>(`/admin/updates/${id}/archive`, {
      method: 'POST',
    });
  },

  reviewResponse: async (updateId: string, responseId: string, adminNotes: string) => {
    return request<{ success: boolean; message: string }>(`/admin/updates/${updateId}/responses/${responseId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ adminNotes }),
    });
  },
};
