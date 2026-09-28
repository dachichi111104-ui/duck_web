import { DashboardStats, Barn, Flock, ProductionRecord, InventoryItem, InventoryTransaction, VetRecord, Vaccination, Disease, AIAlert, AIAnalyzeResponse, Camera, Notification } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';

export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token');
  }
  return null;
}

export function setAuthTokens(access: string, refresh: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
  }
}

export function clearAuthTokens() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_user');
    localStorage.removeItem('is_demo_mode');
  }
}

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      clearAuthTokens();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?expired=true';
      }
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: 'Lỗi hệ thống' }));
      let detailMsg = 'Lỗi hệ thống';
      if (typeof errData.detail === 'string') {
        detailMsg = errData.detail;
      } else if (Array.isArray(errData.detail)) {
        detailMsg = errData.detail.map((e: any) => `${e.loc ? e.loc.join('.') + ': ' : ''}${e.msg || JSON.stringify(e)}`).join('\n');
      } else if (errData.detail && typeof errData.detail === 'object') {
        detailMsg = JSON.stringify(errData.detail);
      } else if (errData.message) {
        detailMsg = typeof errData.message === 'string' ? errData.message : JSON.stringify(errData.message);
      }
      throw new Error(detailMsg || `HTTP Error ${res.status}`);
    }

    return await res.json();
  } catch (err: any) {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      console.warn(`[API Demo Mode] Fallback for ${endpoint}:`, err.message);
      return getFallbackData(endpoint) as unknown as T;
    }
    throw err;
  }
}

function getFallbackData(endpoint: string): any {
  if (endpoint.includes('/dashboard/stats')) {
    return {
      total_flocks: 4,
      total_ducks: 10550,
      total_barns: 4,
      today_eggs: 3120,
      today_mortality: 1,
      active_alerts_count: 2,
      low_stock_items_count: 2,
      upcoming_vaccinations_count: 2,
    } as DashboardStats;
  }

  if (endpoint.includes('/dashboard/charts')) {
    const result = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      result.push({
        date: d.toISOString().split('T')[0],
        eggs: 2900 + Math.floor(Math.random() * 400),
        mortality: Math.random() < 0.2 ? 1 : 0,
        feed: 430 + Math.floor(Math.random() * 30),
      });
    }
    return result;
  }

  if (endpoint.includes('/barns')) {
    return [
      { id: 1, code: 'CH-01', name: 'Chuồng Úm A1', capacity: 3000, current_occupancy: 2500, status: 'ACTIVE', description: 'Chuồng úm giữ nhiệt tự động', created_at: '2026-01-01' },
      { id: 2, code: 'CH-02', name: 'Chuồng Thịt B1', capacity: 5000, current_occupancy: 4200, status: 'ACTIVE', description: 'Chuồng nuôi thịt có hồ tắm', created_at: '2026-01-01' },
      { id: 3, code: 'CH-03', name: 'Chuồng Đẻ C1', capacity: 4000, current_occupancy: 3800, status: 'ACTIVE', description: 'Chuồng sinh sản thu trứng', created_at: '2026-01-01' },
      { id: 4, code: 'CH-04', name: 'Chuồng Cách Ly D1', capacity: 500, current_occupancy: 50, status: 'ACTIVE', description: 'Khu vực điều trị thú y', created_at: '2026-01-01' },
    ] as Barn[];
  }

  if (endpoint.includes('/cameras')) {
    return [
      { id: 1, name: 'Cam 01 - Góc Úm A1 (HD)', barn_id: 1, status: 'ONLINE', rtsp_url: 'rtsp://192.168.1.101:554/stream1', created_at: '2026-01-01', barn: { id: 1, name: 'Chuồng Úm A1', code: 'CH-01', capacity: 3000, current_occupancy: 2500, status: 'ACTIVE', created_at: '2026-01-01' } },
      { id: 2, name: 'Cam 02 - Góc Hồ Tắm B1', barn_id: 2, status: 'ONLINE', rtsp_url: 'rtsp://192.168.1.102:554/stream1', created_at: '2026-01-01', barn: { id: 2, name: 'Chuồng Thịt B1', code: 'CH-02', capacity: 5000, current_occupancy: 4200, status: 'ACTIVE', created_at: '2026-01-01' } },
      { id: 3, name: 'Cam 03 - Máng Đẻ C1', barn_id: 3, status: 'ONLINE', rtsp_url: 'rtsp://192.168.1.103:554/stream1', created_at: '2026-01-01', barn: { id: 3, name: 'Chuồng Đẻ C1', code: 'CH-03', capacity: 4000, current_occupancy: 3800, status: 'ACTIVE', created_at: '2026-01-01' } },
      { id: 4, name: 'Cam 04 - Khu Cách Ly D1', barn_id: 4, status: 'OFFLINE', rtsp_url: 'rtsp://192.168.1.104:554/stream1', created_at: '2026-01-01', barn: { id: 4, name: 'Chuồng Cách Ly D1', code: 'CH-04', capacity: 500, current_occupancy: 50, status: 'ACTIVE', created_at: '2026-01-01' } },
    ] as Camera[];
  }

  if (endpoint.includes('/notifications')) {
    return [
      { id: 1, user_id: 1, title: 'Cảnh báo AI Nhận diện', message: 'Phát hiện 2 cá thể vịt ủ rũ tại Chuồng Thịt B1', is_read: false, created_at: new Date(Date.now() - 1800000).toISOString() },
      { id: 2, user_id: 1, title: 'Cảnh báo Tồn kho', message: 'Vắc xin H5N1 giảm xuống dưới mức tối thiểu (800 liều)', is_read: false, created_at: new Date(Date.now() - 10800000).toISOString() },
      { id: 3, user_id: 1, title: 'Nhắc lịch tiêm phòng', message: 'Đàn Vịt Trời FL-2026-01 có lịch tiêm vắc xin H5N1 sau 3 ngày', is_read: true, created_at: new Date(Date.now() - 43200000).toISOString() },
    ] as Notification[];
  }

  if (endpoint.includes('/flocks')) {
    return {
      data: [
        { id: 1, code: 'FL-2026-01', name: 'Đàn Vịt Trời Giống F1 - Đợt 1', barn_id: 1, initial_quantity: 2600, current_quantity: 2500, age_weeks: 3, status: 'BROODING', entry_date: '2026-03-01', description: 'Đàn vịt giống F1', created_at: '2026-03-01', barn: { id: 1, name: 'Chuồng Úm A1', code: 'CH-01', capacity: 3000, current_occupancy: 2500, status: 'ACTIVE', created_at: '2026-01-01' } },
        { id: 2, code: 'FL-2026-02', name: 'Đàn Vịt Thương Phẩm B1', barn_id: 2, initial_quantity: 4300, current_quantity: 4200, age_weeks: 12, status: 'GROWING', entry_date: '2026-01-01', description: 'Đàn nuôi thương phẩm', created_at: '2026-01-01', barn: { id: 2, name: 'Chuồng Thịt B1', code: 'CH-02', capacity: 5000, current_occupancy: 4200, status: 'ACTIVE', created_at: '2026-01-01' } },
        { id: 3, code: 'FL-2026-03', name: 'Đàn Vịt Sinh Sản C1', barn_id: 3, initial_quantity: 3900, current_quantity: 3800, age_weeks: 28, status: 'LAYING', entry_date: '2025-09-01', description: 'Đàn vịt đẻ trứng', created_at: '2025-09-01', barn: { id: 3, name: 'Chuồng Đẻ C1', code: 'CH-03', capacity: 4000, current_occupancy: 3800, status: 'ACTIVE', created_at: '2025-09-01' } },
        { id: 4, code: 'FL-2026-04', name: 'Đàn Theo Dõi Thú Y D1', barn_id: 4, initial_quantity: 50, current_quantity: 50, age_weeks: 10, status: 'GROWING', entry_date: '2026-03-15', description: 'Theo dõi thú y', created_at: '2026-03-15', barn: { id: 4, name: 'Chuồng Cách Ly D1', code: 'CH-04', capacity: 500, current_occupancy: 50, status: 'ACTIVE', created_at: '2026-01-01' } },
      ],
      total: 4, page: 1, limit: 10
    };
  }

  return [];
}
