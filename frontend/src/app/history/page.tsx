'use client';

import React, { useState, useEffect } from 'react';
import { History, Filter, User, Scan, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageHeader } from '@/components/PageHeader';
import { fetchApi } from '@/lib/api';

interface LogItem {
  id: string | number;
  time: string;
  user: string;
  type: 'AI' | 'FLOCK' | 'VET' | 'INVENTORY';
  action: string;
  detail: string;
  isAlert?: boolean;
}

export default function HistoryPage() {
  const [filterType, setFilterType] = useState('ALL');
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistoryLogs();
  }, []);

  async function loadHistoryLogs() {
    setLoading(true);
    const combinedLogs: LogItem[] = [];

    // 1. Static sample logs
    const defaultLogs: LogItem[] = [
      { id: 'def-1', time: '2026-03-26 14:30', user: 'Phạm Văn Nhân Viên', type: 'FLOCK', action: 'Ghi nhận sản lượng trứng', detail: 'Đàn Vịt Sinh Sản C1: 3,120 quả trứng thu gom, 1 con hao hụt.' },
      { id: 'def-2', time: '2026-03-26 12:15', user: 'AI Pipeline Auto', type: 'AI', action: 'Phát hiện cảnh báo hành vi', detail: 'Phát hiện 2 cá thể vịt ủ rũ di chuyển chậm tại Chuồng Thịt B1 (Đàn FL-2026-02).' },
      { id: 'def-3', time: '2026-03-26 10:00', user: 'BS. Lê Hoàng Thú Y', type: 'VET', action: 'Kê phác đồ điều trị thú y', detail: 'Tạo bệnh án Nhiễm trùng huyết cho 5 con vịt tại Chuồng Cách Ly D1.' },
      { id: 'def-4', time: '2026-03-25 16:45', user: 'Phạm Văn Nhân Viên', type: 'INVENTORY', action: 'Xuất kho vật tư', detail: 'Xuất 30 bao Cám Úm Vịt Con GreenFeed cho Chuồng Úm A1.' },
    ];

    // 2. Fetch AI Sessions from backend API
    try {
      const apiSessions = await fetchApi<any[]>('/ai/sessions?limit=20');
      if (apiSessions && Array.isArray(apiSessions)) {
        apiSessions.forEach((s) => {
          combinedLogs.push({
            id: `api-ai-${s.id}`,
            time: new Date(s.session_date || s.created_at).toLocaleString('vi-VN'),
            user: 'AI Model (best.pt) System',
            type: 'AI',
            action: `Phân Tích AI Media (${s.video_filename})`,
            detail: `Phát hiện ${s.total_ducks_detected} cá thể vịt (${s.abnormal_count} lật ngửa / bất thường) tại Chuồng ${s.barn?.name || s.barn_id} (${s.flock?.name || s.flock_id}). Status: ${s.status}`,
            isAlert: s.abnormal_count > 0,
          });
        });
      }
    } catch (err) {
      console.log('Backend AI sessions fetch error, using local logs');
    }

    // 3. Fetch LocalStorage AI Sessions generated dynamically from /ai page
    if (typeof window !== 'undefined') {
      try {
        const localSessions = JSON.parse(localStorage.getItem('duck_ai_analysis_sessions') || '[]');
        localSessions.forEach((ls: any) => {
          combinedLogs.push({
            id: `local-ai-${ls.id}`,
            time: ls.time || new Date(ls.session_date).toLocaleString('vi-VN'),
            user: ls.user || 'Nhân viên trang trại',
            type: 'AI',
            action: `Kích hoạt Phân Tích AI (${ls.video_filename})`,
            detail: `Tổng ${ls.total_ducks_detected} cá thể (${ls.supine_count || ls.abnormal_count} nghi LẬT NGỬA) tại ${ls.barn_name} (${ls.flock_name}). ${ls.alerts?.[0] || ''}`,
            isAlert: (ls.supine_count || ls.abnormal_count) > 0,
          });
        });
      } catch (e) {
        console.error(e);
      }
    }

    // Combine and sort by date descending
    const all = [...combinedLogs, ...defaultLogs];
    setLogs(all);
    setLoading(false);
  }

  const filteredLogs = logs.filter(log => {
    if (filterType !== 'ALL' && log.type !== filterType) return false;
    return true;
  });

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <PageHeader
          icon={History}
          title="Lịch Sử Hoạt Động &amp; Log Nhật Ký AI"
          description="Ghi nhận dòng thời gian (timeline) toàn bộ các phiên phân tích AI, thao tác nhập liệu và cảnh báo trang trại"
        />

        {/* Filter Bar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="font-bold text-slate-700">Loại hành động:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-medium"
            >
              <option value="ALL">Tất cả hành động</option>
              <option value="AI">AI Nhận diện &amp; Cảnh báo</option>
              <option value="FLOCK">Quản lý Đàn &amp; Sản lượng</option>
              <option value="VET">Thú y &amp; Bệnh án</option>
              <option value="INVENTORY">Kho vật tư</option>
            </select>
          </div>

          <button
            onClick={loadHistoryLogs}
            className="px-4 py-1.5 rounded-xl bg-brand-500 text-white font-bold text-xs hover:bg-brand-600 transition-colors"
          >
            Làm mới nhật ký
          </button>
        </div>

        {/* Timeline View */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-6">
          <div className="relative border-l-2 border-slate-200 ml-4 space-y-8">
            {filteredLogs.map((log) => (
              <div key={log.id} className="relative pl-6 group">
                <span className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full ring-4 ring-white ${
                  log.isAlert ? 'bg-purple-600 animate-pulse' : 'bg-brand-500'
                }`}></span>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-400">{log.time}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      log.type === 'AI' 
                        ? 'bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {log.type === 'AI' && <Scan className="w-3 h-3 text-purple-600" />}
                      {log.type}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    {log.action}
                    {log.isAlert && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-extrabold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-purple-600" />
                        Phát hiện Vịt Lật Ngửa
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100 font-medium">
                    {log.detail}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    Thực hiện bởi: <strong className="text-slate-800">{log.user}</strong>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
