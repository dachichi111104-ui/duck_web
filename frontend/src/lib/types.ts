export type UserRole = 'ADMIN' | 'FARM_MANAGER' | 'VETERINARIAN' | 'STAFF';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Barn {
  id: number;
  code: string;
  name: string;
  capacity: number;
  current_occupancy: number;
  status: string;
  description?: string;
  created_at: string;
}

export interface Camera {
  id: number;
  code?: string;
  name: string;
  location?: string;
  barn_id: number;
  status: string;
  rtsp_url?: string;
  created_at: string;
  barn?: Barn;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Flock {
  id: number;
  code: string;
  name: string;
  barn_id: number;
  initial_quantity: number;
  current_quantity: number;
  age_weeks: number;
  status: 'BROODING' | 'GROWING' | 'LAYING' | 'COMPLETED';
  entry_date: string;
  description?: string;
  created_at: string;
  barn?: Barn;
}

export interface ProductionRecord {
  id: number;
  flock_id: number;
  record_date: string;
  eggs_collected: number;
  mortality_count: number;
  feed_consumed_kg: number;
  weight_avg_gram: number;
  notes?: string;
  created_at: string;
}

export interface InventoryCategory {
  id: number;
  name: string;
  description?: string;
}

export interface InventoryItem {
  id: number;
  category_id: number;
  code: string;
  name: string;
  unit: string;
  min_quantity: number;
  current_quantity: number;
  expiry_date?: string;
  cost_per_unit: number;
  notes?: string;
  category?: InventoryCategory;
}

export interface InventoryTransaction {
  id: number;
  item_id: number;
  transaction_type: 'IMPORT' | 'EXPORT' | 'ADJUSTMENT';
  quantity: number;
  transaction_date: string;
  performed_by: string;
  notes?: string;
  item?: InventoryItem;
}

export interface Disease {
  id: number;
  code: string;
  name: string;
  symptoms: string;
  treatment: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface VetRecord {
  id: number;
  flock_id: number;
  disease_id: number;
  diagnosis_date: string;
  status: 'MONITORING' | 'TREATING' | 'RECOVERED' | 'CULLED';
  affected_count: number;
  treatment_plan: string;
  veterinarian_name: string;
  notes?: string;
  created_at: string;
  disease?: Disease;
  flock?: Flock;
}

export interface Vaccination {
  id: number;
  flock_id: number;
  vaccine_name: string;
  scheduled_date: string;
  administered_date?: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';
  dosage: string;
  notes?: string;
  created_at: string;
  flock?: Flock;
}

export interface AIDetectionTrack {
  frame_index: number;
  timestamp_sec: number;
  track_id: number;
  behavior_label: string;
  confidence: number;
  bbox: [number, number, number, number];
}

export interface AIAnalyzeResponse {
  session_id: number;
  flock_id: number;
  barn_id: number;
  video_filename: string;
  duration_seconds: number;
  total_ducks_detected: number;
  abnormal_count: number;
  behavior_summary: Record<string, number>;
  tracks: AIDetectionTrack[];
  alerts_generated: string[];
}

export interface AIAlert {
  id: number;
  session_id?: number;
  flock_id: number;
  alert_type: string;
  severity: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: string;
  status: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';
  flock?: Flock;
}

export interface DashboardStats {
  total_flocks: number;
  total_ducks: number;
  total_barns: number;
  today_eggs: number;
  today_mortality: number;
  active_alerts_count: number;
  low_stock_items_count: number;
  upcoming_vaccinations_count: number;
}
