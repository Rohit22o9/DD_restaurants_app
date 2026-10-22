import { Platform } from 'react-native';
import { storage } from './storage';

// In Android emulator, 10.0.2.2 maps to host machine's localhost
export const DEFAULT_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
export const API_BASE = `${DEFAULT_HOST}/api/v1`;

class MobileApi {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await storage.getToken();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE}${endpoint}`;
    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Request failed`);
      }

      return data;
    } catch (err: any) {
      console.warn(`[API Network Error] ${url}:`, err.message);
      throw new Error(err.message || 'Unable to connect to Daily Drop operations server. Check your network.');
    }
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<{ success: boolean; token: string; user: any; restaurant: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe() {
    return this.request<{ success: boolean; user: any; restaurant: any }>('/auth/me');
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ success: boolean; message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // Dashboard & Feeds
  async getDashboard() {
    return this.request<{ success: boolean; data: any }>('/restaurant/dashboard');
  }

  async getUpdates(params?: { filter?: string; sort?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.filter) query.append('filter', params.filter);
    if (params?.sort) query.append('sort', params.sort);
    if (params?.search) query.append('search', params.search);
    return this.request<{ success: boolean; data: any[] }>(`/restaurant/updates?${query.toString()}`);
  }

  async getUpdateDetail(id: string) {
    return this.request<{ success: boolean; data: any }>(`/restaurant/updates/${id}`);
  }

  // Actions
  async acknowledgeUpdate(id: string) {
    return this.request<{ success: boolean; message: string; acknowledgedAt: string }>(`/restaurant/updates/${id}/acknowledge`, {
      method: 'POST',
    });
  }

  async submitResponse(
    id: string,
    payload: {
      availabilityStatus?: string;
      availabilityDetails?: any;
      answerText?: string;
      selectedOptions?: string[];
      isDraft?: boolean;
    }
  ) {
    return this.request<{ success: boolean; message: string; data: any }>(`/restaurant/updates/${id}/response`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getResponsesHistory() {
    return this.request<{ success: boolean; data: any[] }>('/restaurant/responses');
  }

  // Notifications
  async getNotifications() {
    return this.request<{ success: boolean; data: any[] }>('/restaurant/notifications');
  }

  async markNotificationRead(id: string) {
    return this.request<{ success: boolean; message: string }>(`/restaurant/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  async markAllNotificationsRead() {
    return this.request<{ success: boolean; message: string }>('/restaurant/notifications/mark-all-read', {
      method: 'PATCH',
    });
  }

  // Profile
  async updateProfile(data: { phone?: string; address?: string; notes?: string; ownerName?: string }) {
    return this.request<{ success: boolean; message: string; data: any }>('/restaurant/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  getAttachmentDownloadUrl(updateId: string, attachmentId: string) {
    return `${API_BASE}/restaurant/updates/${updateId}/attachments/${attachmentId}/download`;
  }
}

export const mobileApi = new MobileApi();
