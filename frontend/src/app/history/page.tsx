'use client';

import React, { useState } from 'react';
import { History, Calendar, Filter, User, Activity, CheckCircle2, ShieldAlert } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageHeader } from '@/components/PageHeader';

export default function HistoryPage() {
  const [filterType, setFilterType] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState('2026-03-26');

  const historyLogs = [
    { id: 1, time: '2026-03-26 14:30', user: 'Phạm Văn Nhân Viên', type: 'FLOCK', action: 'Ghi nhận sản lượng trứng', detail: 'Đàn Vịt Sinh Sản C1: 3,120 quả trứng thu gom, 1 con hao hụt.' },
    { id: 2, time: '2026-03-26 12:15', user: 'AI Pipeline Auto', type: 'AI', action: 'Phát hiện cảnh báo hành vi', detail: 'Phát hiện 2 cá thể vịt ủ rũ di chuyển chậm tại Chuồng Thịt B1 (Đàn FL-2026-02).' },
    { id: 3, time: '2026-03-26 10:00', user: 'BS. Lê Hoàng Thú Y', type: 'VET', action: 'Kê phác đồ điều trị thú y', detail: 'Tạo bệnh án Nhiễm trùng huyết cho 5 con vịt tại Chuồng Cách Ly D1.' },
    { id: 4, time: '2026-03-25 16:45', user: 'Phạm Văn Nhân Viên', type: 'INVENTORY', action: 'Xuất kho vật tư', detail: 'Xuất 30 bao Cám Úm Vịt Con GreenFeed cho Chuồng Úm A1.' },
    { id: 5, time: '2026-03-25 09:00', user: 'Trần Thị Quản Lý', type: 'FLOCK', action: 'Tạo đàn vịt mới', detail: 'Khởi tạo Đàn Vịt Trời Giống F1 - Đợt 1 (Mã FL-2026-01, sĩ số 2,600 con).' },
  ];

  const filteredLogs = historyLogs.filter(log => {
    if (filterType !== 'ALL' && log.type !== filterType) return false;
    return true;
  });

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <PageHeader
          icon={History}
          title="Lịch Sử Hoạt Động &amp; Log Nhật Ký"
          description="Ghi nhận dòng thời gian (timeline) toàn bộ thao tác nhập liệu, biến động trang trại và cảnh báo AI"
        />

        {/* Filter Bar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="font-bold text-slate-700">Loại hành động:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white"
            >
              <option value="ALL">Tất cả hành động</option>
              <option value="FLOCK">Quản lý Đàn &amp; Sản lượng</option>
              <option value="AI">AI Nhận diện &amp; Cảnh báo</option>
              <option value="VET">Thú y &amp; Bệnh án</option>
              <option value="INVENTORY">Kho vật tư</option>
            </select>
          </div>
        </div>

        {/* Timeline View */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-6">
          <div className="relative border-l-2 border-slate-200 ml-4 space-y-8">
            {filteredLogs.map((log) => (
              <div key={log.id} className="relative pl-6 group">
                <span className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-brand-500 ring-4 ring-white"></span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-400">{log.time}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                      {log.type}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{log.action}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
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
