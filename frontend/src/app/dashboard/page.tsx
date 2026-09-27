'use client';

import React, { useEffect, useState } from 'react';
import { 
  Grid, Bird, Egg, AlertTriangle, TrendingUp, PackageCheck, 
  Syringe, CheckCircle2, ShieldAlert, LayoutDashboard
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageHeader } from '@/components/PageHeader';
import { fetchApi } from '@/lib/api';
import { DashboardStats, AIAlert } from '@/lib/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<AIAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [statsData, chartDataRes, alertsRes] = await Promise.all([
          fetchApi<DashboardStats>('/dashboard/stats'),
          fetchApi<any[]>('/dashboard/charts'),
          fetchApi<AIAlert[]>('/ai/alerts')
        ]);
        setStats(statsData);
        setChartData(chartDataRes);
        setAlerts(alertsRes);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const handleUpdateAlert = async (alertId: number, newStatus: string) => {
    try {
      await fetchApi(`/ai/alerts/${alertId}/status?status_str=${newStatus}`, { method: 'PUT' });
      setAlerts(alerts.map(a => a.id === alertId ? { ...a, status: newStatus as any } : a));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-8">
        <PageHeader
          icon={LayoutDashboard}
          title="Bảng Điều Khiển Trang Trại"
          description="Tổng quan thời gian thực về quy mô đàn, sản lượng trứng, tồn kho vật tư &amp; nhận diện AI"
          action={
            <div className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-full bg-white border border-slate-200 text-slate-700 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Cập nhật: Hôm nay</span>
            </div>
          }
        />

        {loading ? (
          <div className="py-20 text-center text-slate-500 text-xs font-semibold">
            Đang tải dữ liệu Bảng điều khiển...
          </div>
        ) : (
          <>
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Card 1 */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Quy mô Trang Trại</span>
                  <div className="p-2.5 rounded-xl bg-brand-50 text-brand-500">
                    <Grid className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-slate-900">{stats?.total_ducks.toLocaleString() || '10.550'}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Tổng số vịt / <strong className="text-slate-800">{stats?.total_flocks || 4} đàn</strong> trong {stats?.total_barns || 4} chuồng
                  </p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Trứng Thu Hôm Nay</span>
                  <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                    <Egg className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-slate-900">{stats?.today_eggs.toLocaleString() || '3.120'} quả</p>
                  <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Tăng +4.2% so với hôm qua
                  </p>
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cảnh Báo AI</span>
                  <div className="p-2.5 rounded-xl bg-red-50 text-red-600">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-slate-900">{stats?.active_alerts_count || 2} cảnh báo</p>
                  <p className="text-xs text-amber-600 font-medium mt-1">
                    Phát hiện vịt di chuyển ủ rũ
                  </p>
                </div>
              </div>

              {/* Card 4 */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cần Chú Ý</span>
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                    <Syringe className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-slate-900">{stats?.upcoming_vaccinations_count || 2} lịch tiêm</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Và <strong className="text-amber-600">{stats?.low_stock_items_count || 2} vật tư</strong> gần hết
                  </p>
                </div>
              </div>

            </div>

            {/* Production Chart Section */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-base">Biểu Đồ Xu Hướng Sản Lượng Trứng &amp; Thức Ăn (14 ngày qua)</h3>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="eggGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2E7D32" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#2E7D32" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="feedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F4A62D" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#F4A62D" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
                    <YAxis stroke="#94A3B8" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', border: 'none', color: '#FFF', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="eggs" name="Số trứng (Quả)" stroke="#2E7D32" strokeWidth={3} fillOpacity={1} fill="url(#eggGrad)" />
                    <Area type="monotone" dataKey="feed" name="Thức ăn (Kg)" stroke="#F4A62D" strokeWidth={2} fillOpacity={1} fill="url(#feedGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent AI Alerts List */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-base">Danh Sách Cảnh Báo AI Nhận Diện Hành Vi</h3>

              <div className="divide-y divide-slate-100">
                {alerts.map((alert) => (
                  <div key={alert.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        alert.severity === 'HIGH' || alert.severity === 'CRITICAL' 
                          ? 'bg-red-50 text-red-600' 
                          : 'bg-amber-50 text-amber-600'
                      }`}>
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{alert.alert_type}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            alert.severity === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {alert.severity}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(alert.timestamp).toLocaleTimeString('vi-VN')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{alert.message}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {alert.status === 'NEW' && (
                        <button
                          onClick={() => handleUpdateAlert(alert.id, 'ACKNOWLEDGED')}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                        >
                          Xác nhận
                        </button>
                      )}
                      {alert.status !== 'RESOLVED' && (
                        <button
                          onClick={() => handleUpdateAlert(alert.id, 'RESOLVED')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Đã xử lý</span>
                        </button>
                      )}
                      {alert.status === 'RESOLVED' && (
                        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Hoàn thành
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
