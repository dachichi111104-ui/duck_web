'use client';

import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, Calendar, Filter, FileText, Scan, Plus, X } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageHeader } from '@/components/PageHeader';
import { fetchApi } from '@/lib/api';
import { Flock } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';

export default function ReportsPage() {
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [startDate, setStartDate] = useState('2026-03-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedFlock, setSelectedFlock] = useState<string>('');

  const [summaryData, setSummaryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Production Log Modal state
  const [showLogModal, setShowLogModal] = useState(false);
  const [prodForm, setProdForm] = useState({
    flock_id: 1,
    record_date: new Date().toISOString().split('T')[0],
    eggs_collected: 500,
    mortality_count: 0,
    feed_consumed_kg: 120.5,
    weight_avg_gram: 1850,
    notes: '',
  });

  const { hasRole } = useAuth();

  useEffect(() => {
    loadFlocks();
    fetchReport();
  }, []);

  async function loadFlocks() {
    try {
      const res = await fetchApi<{ data: Flock[] }>('/flocks');
      setFlocks(res.data || []);
      if (res.data && res.data.length > 0) {
        setProdForm(prev => ({ ...prev, flock_id: res.data[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchReport() {
    setLoading(true);
    try {
      let url = `/reports/summary?start_date=${startDate}&end_date=${endDate}`;
      if (selectedFlock) url += `&flock_id=${selectedFlock}`;
      const data = await fetchApi<any>(url);
      setSummaryData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSaveProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/production', {
        method: 'POST',
        body: JSON.stringify(prodForm),
      });
      setShowLogModal(false);
      fetchReport();
    } catch (err: any) {
      alert(err.message || 'Lỗi ghi sản lượng');
    }
  };

  const handleExportExcel = () => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';
    let exportUrl = `${API_BASE_URL}/reports/export/excel?start_date=${startDate}&end_date=${endDate}`;
    if (selectedFlock) exportUrl += `&flock_id=${selectedFlock}`;
    window.open(exportUrl, '_blank');
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <PageHeader
          icon={FileSpreadsheet}
          title="Báo Cáo &amp; Thống Kê Sản Lượng"
          description="Tổng hợp dữ liệu sản lượng trứng, tỷ lệ FCR, phân tích độ chính xác AI và kết xuất file Excel / PDF"
          action={
            <div className="flex items-center gap-2">
              {hasRole(['ADMIN', 'FARM_MANAGER', 'STAFF']) && (
                <button
                  onClick={() => setShowLogModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ghi Nhật Ký Sản Lượng</span>
                </button>
              )}

              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Xuất Excel (.xlsx)</span>
              </button>

              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all"
              >
                <FileText className="w-4 h-4" />
                <span>Xuất PDF</span>
              </button>
            </div>
          }
        />

        {/* Filter Toolbar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-bold text-slate-700">Từ ngày:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Đến ngày:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="font-bold text-slate-700">Lọc theo đàn:</span>
            <select
              value={selectedFlock}
              onChange={(e) => setSelectedFlock(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white"
            >
              <option value="">Tất cả các đàn</option>
              {flocks.map(f => (
                <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchReport}
            className="px-4 py-1.5 rounded-xl bg-brand-500 text-white font-bold text-xs hover:bg-brand-600 transition-colors"
          >
            Áp dụng bộ lọc
          </button>
        </div>

        {/* Totals Summary */}
        {summaryData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <p className="text-xs text-slate-400 font-bold uppercase">Tổng Trứng Thu Được</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">
                {(summaryData.totals?.total_eggs || 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">quả</span>
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <p className="text-xs text-slate-400 font-bold uppercase">Tổng Hao Hụt (Tử Lệ)</p>
              <p className="text-3xl font-extrabold text-red-600 mt-1">
                {(summaryData.totals?.total_mortality || 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">con</span>
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <p className="text-xs text-slate-400 font-bold uppercase">Tổng Thức Ăn Tiêu Thụ</p>
              <p className="text-3xl font-extrabold text-amber-600 mt-1">
                {(summaryData.totals?.total_feed_kg || 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">kg</span>
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <p className="text-xs text-slate-400 font-bold uppercase">Hệ Số Chuyển Đổi FCR (Ước Tính)</p>
              <p className="text-3xl font-extrabold text-brand-600 mt-1">
                {summaryData.totals?.estimated_fcr || 0}
              </p>
            </div>
          </div>
        )}

        {/* AI ACCURACY ANALYSIS BY DENSITY */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Scan className="w-5 h-5 text-brand-500" />
                Phân Tích Độ Chính Xác AI Theo Mật Độ Đàn (6-10-20-30-50 con/khung hình)
              </h3>
              <p className="text-xs text-slate-500">So sánh chỉ số mAP &amp; độ tin cậy AI dựa trên mật độ cá thể trong khung hình camera</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase">
                <tr>
                  <th className="p-3">Mật Độ Cá Thể</th>
                  <th className="p-3">Số Lượng Session Thật</th>
                  <th className="p-3">Độ Tin Cậy Trung Bình (mAP@0.5)</th>
                  <th className="p-3">Trạng Thái Dữ Liệu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-3 font-bold text-slate-900">Mật độ thấp (6 - 10 con)</td>
                  <td className="p-3 font-mono">1 Session</td>
                  <td className="p-3 font-bold text-emerald-700">94.5%</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">Có dữ liệu</span></td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-slate-900">Mật độ trung bình (20 con)</td>
                  <td className="p-3 font-mono">0 Session</td>
                  <td className="p-3 font-mono text-slate-400">N/A</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px]">Chưa đủ dữ liệu</span></td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-slate-900">Mật độ cao (30 - 50 con)</td>
                  <td className="p-3 font-mono">0 Session</td>
                  <td className="p-3 font-mono text-slate-400">N/A</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px]">Chưa đủ dữ liệu</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Records Table */}
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-bold text-slate-900 text-sm">
            Chi Tiết Nhật Ký Sản Lượng Theo Ngày
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase">
                <tr>
                  <th className="p-4">Ngày Ghi Nhận</th>
                  <th className="p-4">Tên Đàn Vịt</th>
                  <th className="p-4">Số Trứng Thu (Quả)</th>
                  <th className="p-4">Số Vịt Chết (Con)</th>
                  <th className="p-4">Thức Ăn (Kg)</th>
                  <th className="p-4">Trọng Lượng TB (g)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summaryData?.records?.map((rec: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-4 font-mono font-bold text-slate-900">{rec.record_date}</td>
                    <td className="p-4 font-medium text-slate-800">{rec.flock_name}</td>
                    <td className="p-4 font-bold text-emerald-700">{rec.eggs_collected.toLocaleString()}</td>
                    <td className="p-4 text-red-600 font-semibold">{rec.mortality_count}</td>
                    <td className="p-4 font-semibold text-amber-600">{rec.feed_consumed_kg} kg</td>
                    <td className="p-4 font-mono">{rec.weight_avg_gram} g</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL: LOG PRODUCTION */}
        {showLogModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <h3 className="font-bold text-slate-900 text-lg">Ghi Nhật Ký Sản Lượng Hàng Ngày</h3>
                <button onClick={() => setShowLogModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <form onSubmit={handleSaveProduction} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chọn Đàn Vịt *</label>
                  <select
                    value={prodForm.flock_id}
                    onChange={(e) => setProdForm({ ...prodForm, flock_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border bg-white"
                  >
                    {flocks.map(f => (
                      <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ngày ghi nhận</label>
                    <input
                      type="date"
                      required
                      value={prodForm.record_date}
                      onChange={(e) => setProdForm({ ...prodForm, record_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Số trứng thu (Quả)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={prodForm.eggs_collected}
                      onChange={(e) => setProdForm({ ...prodForm, eggs_collected: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Số vịt chết (Con)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={prodForm.mortality_count}
                      onChange={(e) => setProdForm({ ...prodForm, mortality_count: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border text-red-600 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Thức ăn (Kg)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={0.1}
                      value={prodForm.feed_consumed_kg}
                      onChange={(e) => setProdForm({ ...prodForm, feed_consumed_kg: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Trọng lượng TB (g)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={prodForm.weight_avg_gram}
                      onChange={(e) => setProdForm({ ...prodForm, weight_avg_gram: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ghi chú thêm</label>
                  <input
                    type="text"
                    placeholder="Thời tiết, chất lượng trứng..."
                    value={prodForm.notes}
                    onChange={(e) => setProdForm({ ...prodForm, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLogModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                  >
                    Hủy
                  </button>
                  <button type="submit" className="px-5 py-2 rounded-xl bg-brand-500 text-white font-bold">
                    Lưu Nhật Ký
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
