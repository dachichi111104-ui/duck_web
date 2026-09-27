'use client';

import React, { useState, useEffect } from 'react';
import { Bird, ShieldCheck, Database, Server, Cpu, CheckCircle2, AlertTriangle } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface HealthStatus {
  status: string;
  database_engine: string;
  database_host: string;
  database_name: string;
  connection_status: string;
  server_time?: string;
}

export function Footer() {
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    async function loadHealth() {
      try {
        const data = await fetchApi<HealthStatus>('/health');
        if (data) setHealth(data);
      } catch (err) {
        console.error('Lỗi kết nối health check:', err);
      }
    }
    loadHealth();
  }, []);

  return (
    <footer className="bg-slate-900 text-slate-400 text-xs py-10 border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-base mb-3">
              <Bird className="w-5 h-5 text-brand-500" />
              <span>DuckCare AI</span>
            </div>
            <p className="text-slate-400 leading-relaxed mb-4">
              Hệ thống Web App Demo giám sát hành vi & hỗ trợ chẩn đoán bệnh vịt trời ứng dụng trí tuệ nhân tạo.
            </p>
            <span className="inline-block px-3 py-1 rounded-full bg-slate-800 text-emerald-400 font-mono text-[11px]">
              PostgreSQL + FastAPI + Next.js
            </span>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Phân Hệ Quản Lý</h4>
            <ul className="space-y-2">
              <li>Quản lý Đàn & Chuồng nuôi</li>
              <li>Theo dõi Sản lượng trứng & Hao hụt</li>
              <li>Kho vật tư & Nhập/Xuất kho</li>
              <li>Thú y & Lịch tiêm phòng</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Công Nghệ AI Integration</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-brand-500" />
                YOLOv8 Behavior Detection
              </li>
              <li className="flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-brand-500" />
                FastAPI Async Pipeline
              </li>
              <li className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-brand-500" />
                PostgreSQL Relational DB
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Phạm Vi Đồ Án Demo</h4>
            <p className="leading-relaxed mb-3">
              Bản Web App nâng cấp phục vụ báo cáo Hội đồng Chấm đồ án CNTT. Hoạt động độc lập với bản Desktop ứng dụng cho nông dân.
            </p>
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Đồ án Chuyên ngành CNTT 2026</span>
            </div>
          </div>
        </div>

        {/* Dynamic Database Connection Indicator Line */}
        {health && (
          <div className="my-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-wrap items-center justify-between gap-2 text-slate-300 text-[11px]">
            <div className="flex items-center gap-2 font-mono">
              <Database className="w-4 h-4 text-brand-400 shrink-0" />
              <span>DB Engine:</span>
              <span className="font-bold text-emerald-400 uppercase">{health.database_engine}</span>
              <span>@</span>
              <span className="text-slate-200">{health.database_host}/{health.database_name}</span>
            </div>
            <div className="flex items-center gap-2">
              {health.connection_status === 'connected' ? (
                <span className="flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-800/50">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Đã kết nối thành công
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-400 font-semibold bg-red-950/50 px-2.5 py-0.5 rounded-full border border-red-800/50">
                  <AlertTriangle className="w-3.5 h-3.5" /> Lỗi kết nối
                </span>
              )}
              {health.server_time && (
                <span className="text-slate-400 font-mono text-[10px]">
                  (DB Time: {health.server_time.split('.')[0]})
                </span>
              )}
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-slate-800 text-center text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© 2026 DuckCare AI Web Demo System. All rights reserved.</p>
          <p className="text-[11px]">Thiết kế theo chuẩn Design System NCKH chuyên nghiệp</p>
        </div>
      </div>
    </footer>
  );
}
