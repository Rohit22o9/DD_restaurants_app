import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { storage } from './storage';

export const PROD_API_HOST = 'https://dd-restaurants-app.onrender.com';

// Automatically detect host IP from Expo connection or fallback to live Render production API
const debuggerHost = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoClient?.hostUri;
export const DETECTED_LAN_IP = debuggerHost ? debuggerHost.split(':')[0] : null;

export const getBaseHost = async (): Promise<string> => {
  const custom = await storage.getServerUrl();
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/$/, '');
  }
  // In release standalone APK builds, always connect securely to live Render backend
  if (!__DEV__) {
    return PROD_API_HOST;
  }
  if (Platform.OS === 'web') {
    return 'http://localhost:4000';
  }
  // In local Expo Go development, connect to local PC if running, otherwise Render
  return DETECTED_LAN_IP ? `http://${DETECTED_LAN_IP}:4000` : PROD_API_HOST;
};

class MobileApi {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await storage.getToken();
    const baseHost = await getBaseHost();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${baseHost}/api/v1${endpoint}`;
    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Request failed`);
      }

      return data;
    } catch (err: any) {
      console.warn(`[API Network Error] ${url}:`, err.message);
      throw new Error(err.message || `Unable to connect to Daily Drop operations server at ${baseHost}. Please check network.`);
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

  async getAttachmentDownloadUrl(updateId: string, attachmentId: string) {
    const baseHost = await getBaseHost();
    return `${baseHost}/api/v1/restaurant/updates/${updateId}/attachments/${attachmentId}/download`;
  }

  // ==========================================
  // 1. LIVE ORDERS & KDS
  // ==========================================
  async getOrders(status?: string) {
    const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    return this.request<{ success: boolean; data: any[]; counts: { incoming: number; preparing: number; ready: number; dispatched: number; total: number } }>(
      `/restaurant/orders${query}`
    );
  }

  async updateOrderStatus(orderId: string, status: string, prepTimeMins?: number) {
    return this.request<{ success: boolean; message: string; data: any }>(`/restaurant/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, prepTimeMins }),
    });
  }

  async verifyDispatchPin(orderId: string, pin: string) {
    return this.request<{ success: boolean; message: string }>(`/restaurant/orders/${orderId}/verify-dispatch`, {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
  }

  // ==========================================
  // 2. MENU 86ing & STOCK AVAILABILITY
  // ==========================================
  async getMenu() {
    return this.request<{ success: boolean; data: any[] }>('/restaurant/menu');
  }

  async toggleMenuStock(itemId: string, isAvailable?: boolean) {
    return this.request<{ success: boolean; message: string; data: any }>(`/restaurant/menu/${itemId}/toggle-stock`, {
      method: 'PATCH',
      body: JSON.stringify({ isAvailable }),
    });
  }

  // ==========================================
  // 3. PAYOUTS & EARNINGS RECONCILIATION
  // ==========================================
  async getPayouts() {
    return this.request<{
      success: boolean;
      data: any[];
      summary: {
        totalLifetimeNetEarnings: number;
        currentPendingPayout: number;
        bankAccountEnding: string;
        payoutCycle: string;
      };
    }>('/restaurant/payouts');
  }
}

export const mobileApi = new MobileApi();
