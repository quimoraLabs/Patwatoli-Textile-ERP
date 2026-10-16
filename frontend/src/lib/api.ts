import {
  AuthResponse,
  DashboardMetrics,
  Invoice,
  Item,
  ItemVariant,
  Merchant,
  MerchantLedger,
  Payment,
  Setting,
  AuditLog,
  Backup,
  User,
} from '@/types';

const getBaseUrl = (): string => {
  let base = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1').trim();
  // Strip trailing slashes
  base = base.replace(/\/+$/, '');
  // Auto-append /api/v1 if not present
  if (!base.endsWith('/api/v1')) {
    base = `${base}/api/v1`;
  }
  return base;
};

export const API_BASE_URL = getBaseUrl();

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}

export const authStorage = {
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('ptx_access_token');
  },
  setToken: (token: string) => {
    if (typeof window !== 'undefined') localStorage.setItem('ptx_access_token', token);
  },
  getUser: (): User | null => {
    if (typeof window === 'undefined') return null;
    const str = localStorage.getItem('ptx_user');
    return str ? JSON.parse(str) : null;
  },
  setUser: (u: User) => {
    if (typeof window !== 'undefined') localStorage.setItem('ptx_user', JSON.stringify(u));
  },
  clear: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ptx_access_token');
      localStorage.removeItem('ptx_refresh_token');
      localStorage.removeItem('ptx_user');
    }
  },
};

let isRedirectingToLogin = false;

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = authStorage.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    throw new Error(netErr?.message || 'Network request failed. Is the backend server running?');
  }

  if (res.status === 401) {
    authStorage.clear();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !isRedirectingToLogin) {
      isRedirectingToLogin = true;
      window.location.href = '/login?expired=1';
    }
    throw new Error('Session expired or unauthorized. Please log in again.');
  }

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(res.ok ? text : `Server error (${res.status}): ${text.trim() || res.statusText}`);
  }

  if (!res.ok || !data.success) {
    const errorMsg = data?.error?.message || 'An error occurred';
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth & Session
  login: async (body: { email: string; password: string }) => {
    const res = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    authStorage.setToken(res.data.access_token);
    authStorage.setUser(res.data.user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ptx_refresh_token', res.data.refresh_token);
    }
    return res.data;
  },
  register: async (body: { name: string; email: string; password: string; phone?: string; role?: string }) => {
    const res = await request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    authStorage.setToken(res.data.access_token);
    authStorage.setUser(res.data.user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ptx_refresh_token', res.data.refresh_token);
    }
    return res.data;
  },
  forgotPassword: (email: string) =>
    request<{ message: string; reset_token: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }).then((r) => r.data),
  resetPassword: (body: { reset_token: string; new_password: string }) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then((r) => r.data),
  logout: async () => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      authStorage.clear();
    }
  },
  me: () => request<User>('/auth/me').then((r) => r.data),
  getMe: () => request<User>('/auth/me').then((r) => r.data),
  updateProfile: (body: { name: string; phone?: string }) =>
    request<User>('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }).then((r) => {
      authStorage.setUser(r.data);
      return r.data;
    }),
  changePassword: (body: { old_password: string; new_password: string }) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(body),
    }).then((r) => r.data),

  // Users (RBAC)
  getUsers: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    return request<User[]>(`/users?${query.toString()}`);
  },
  createUser: (body: { name: string; email: string; password: string; phone?: string; role: string }) =>
    request<User>('/users', { method: 'POST', body: JSON.stringify(body) }).then((r) => r.data),
  updateUser: (id: string, body: { name?: string; phone?: string; role?: string; is_active?: boolean }) =>
    request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }).then((r) => r.data),
  deleteUser: (id: string) => request(`/users/${id}`, { method: 'DELETE' }),
  revokeUserDeletion: (id: string) =>
    request<User>(`/users/${id}/revoke-deletion`, { method: 'POST' }).then((r) => r.data),
  permanentDeleteUser: (id: string) =>
    request(`/users/${id}/permanent`, { method: 'DELETE' }),
  revokeMyDeletion: () =>
    request<User>('/auth/revoke-deletion', { method: 'POST' }).then((r) => r.data),

  // Dashboard
  getDashboardMetrics: () => request<DashboardMetrics>('/dashboard').then((r) => r.data),

  // Merchants
  getMerchants: (params?: { page?: number; limit?: number; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.search) query.set('search', params.search);
    return request<Merchant[]>(`/merchants?${query.toString()}`);
  },
  getMerchant: (id: string) => request<Merchant>(`/merchants/${id}`).then((r) => r.data),
  createMerchant: (body: { name: string; phone?: string; address?: string; gstin?: string; opening_balance?: number }) =>
    request<Merchant>('/merchants', { method: 'POST', body: JSON.stringify(body) }).then((r) => r.data),
  updateMerchant: (id: string, body: { name?: string; phone?: string; address?: string; gstin?: string }) =>
    request<Merchant>(`/merchants/${id}`, { method: 'PUT', body: JSON.stringify(body) }).then((r) => r.data),
  deleteMerchant: (id: string) =>
    request(`/merchants/${id}`, { method: 'DELETE' }).then((r) => r.data),

  // Image Upload (ImageKit / Local / Floci)
  uploadImage: async (file: File): Promise<{ url: string; file_id?: string; provider?: string }> => {
    const token = authStorage.getToken();
    const formData = new FormData();
    formData.append('image', file);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      let errMsg = 'Failed to upload image';
      try {
        const json = JSON.parse(errText);
        errMsg = json?.error?.message || json?.message || errMsg;
      } catch {}
      throw new Error(errMsg);
    }

    const json = await res.json();
    return json.data;
  },

  // Items & Variants CRUD
  getItems: (params?: { page?: number; limit?: number; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.search) query.set('search', params.search);
    return request<Item[]>(`/items?${query.toString()}`);
  },
  createItem: (body: { name: string; category?: string; unit: string; image_url?: string; description?: string; variants?: { size: string; rate: number; image_url?: string }[] }) =>
    request<Item>('/items', { method: 'POST', body: JSON.stringify(body) }).then((r) => r.data),
  updateItem: (id: string, body: { name?: string; category?: string; unit?: string; image_url?: string; description?: string }) =>
    request<Item>(`/items/${id}`, { method: 'PUT', body: JSON.stringify(body) }).then((r) => r.data),
  deleteItem: (id: string) => request(`/items/${id}`, { method: 'DELETE' }),
  addVariant: (itemId: string, body: { size: string; rate: number; image_url?: string }) =>
    request<ItemVariant>(`/items/${itemId}/variants`, { method: 'POST', body: JSON.stringify(body) }).then((r) => r.data),
  updateVariant: (variantId: string, body: { rate?: number; image_url?: string }) =>
    request<ItemVariant>(`/variants/${variantId}`, { method: 'PUT', body: JSON.stringify(body) }).then((r) => r.data),
  deleteVariant: (variantId: string) => request(`/variants/${variantId}`, { method: 'DELETE' }),

  // Invoices
  getInvoices: (params?: { page?: number; limit?: number; merchant_id?: string; status?: string; from_date?: string; to_date?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.merchant_id) query.set('merchant_id', params.merchant_id);
    if (params?.status) query.set('status', params.status);
    if (params?.from_date) query.set('from_date', params.from_date);
    if (params?.to_date) query.set('to_date', params.to_date);
    return request<Invoice[]>(`/invoices?${query.toString()}`);
  },
  getInvoice: (id: string) => request<Invoice>(`/invoices/${id}`).then((r) => r.data),
  createInvoice: (body: { merchant_id: string; invoice_date: string; items: { item_id: string; variant_id: string; qty: number; rate?: number }[] }) =>
    request<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(body) }).then((r) => r.data),
  cancelInvoice: (id: string, reason: string) =>
    request<Invoice>(`/invoices/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }).then((r) => r.data),
  
  // PDF Download & Direct Links (Resolves 401 Unauthorized via ?token= query parameter and Blob download)
  getInvoicePdfUrl: (id: string) => {
    const token = authStorage.getToken();
    return `${API_BASE_URL}/invoices/${id}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
  downloadInvoicePDF: async (id: string, invoiceNo?: string) => {
    const token = authStorage.getToken();
    const url = `${API_BASE_URL}/invoices/${id}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      throw new Error(`Failed to download invoice PDF (status: ${res.status})`);
    }
    const blob = await res.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `${invoiceNo || 'invoice'}_${id.slice(0, 8)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
  },

  // Payments
  getPayments: (params?: { page?: number; limit?: number; merchant_id?: string; from_date?: string; to_date?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.merchant_id) query.set('merchant_id', params.merchant_id);
    if (params?.from_date) query.set('from_date', params.from_date);
    if (params?.to_date) query.set('to_date', params.to_date);
    return request<Payment[]>(`/payments?${query.toString()}`);
  },
  createPayment: (body: { merchant_id: string; amount: number; payment_mode: string; payment_date: string }) =>
    request<Payment>('/payments', { method: 'POST', body: JSON.stringify(body) }).then((r) => r.data),

  // Ledger (Khaata)
  getMerchantLedger: (merchantId: string, params?: { page?: number; limit?: number; from_date?: string; to_date?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.from_date) query.set('from_date', params.from_date);
    if (params?.to_date) query.set('to_date', params.to_date);
    return request<MerchantLedger>(`/merchants/${merchantId}/ledger?${query.toString()}`);
  },

  // Reports
  getSalesReport: (from_date?: string, to_date?: string) => {
    const query = new URLSearchParams();
    if (from_date) query.set('from_date', from_date);
    if (to_date) query.set('to_date', to_date);
    return request<any[]>(`/reports/sales?${query.toString()}`).then((r) => r.data);
  },
  getMerchantWiseReport: (from_date?: string, to_date?: string) => {
    const query = new URLSearchParams();
    if (from_date) query.set('from_date', from_date);
    if (to_date) query.set('to_date', to_date);
    return request<any[]>(`/reports/merchant-wise?${query.toString()}`).then((r) => r.data);
  },
  getItemWiseReport: (from_date?: string, to_date?: string) => {
    const query = new URLSearchParams();
    if (from_date) query.set('from_date', from_date);
    if (to_date) query.set('to_date', to_date);
    return request<any[]>(`/reports/item-wise?${query.toString()}`).then((r) => r.data);
  },
  getGSTReport: (from_date?: string, to_date?: string) => {
    const query = new URLSearchParams();
    if (from_date) query.set('from_date', from_date);
    if (to_date) query.set('to_date', to_date);
    return request<any>(`/reports/gst?${query.toString()}`).then((r) => r.data);
  },

  // Settings
  getSettings: () => request<Setting[]>('/settings').then((r) => r.data),
  updateSettings: (settings: Record<string, string>) =>
    request('/settings', { method: 'PUT', body: JSON.stringify({ settings }) }),

  // Audit Logs
  getAuditLogs: (params?: { page?: number; limit?: number; module?: string; action?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.module) query.set('module', params.module);
    if (params?.action) query.set('action', params.action);
    return request<AuditLog[]>(`/audit-logs?${query.toString()}`);
  },

  // Backups
  getBackups: () => request<Backup[]>('/backups').then((r) => r.data),
  triggerBackup: () => request<Backup>('/backups', { method: 'POST' }).then((r) => r.data),
  getBackupDownloadUrl: (id: string) => {
    const token = authStorage.getToken();
    return `${API_BASE_URL}/backups/${id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
};
