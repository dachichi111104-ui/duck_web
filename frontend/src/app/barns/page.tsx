'use client';

import React, { useEffect, useState } from 'react';
import { Activity, Plus, Edit, Trash2, X, Building } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { fetchApi } from '@/lib/api';
import { Barn } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';

export default function BarnsPage() {
  const [barns, setBarns] = useState<Barn[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingBarn, setEditingBarn] = useState<Barn | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    capacity: 3000,
    status: 'ACTIVE',
    description: '',
  });

  const [deletingBarn, setDeletingBarn] = useState<Barn | null>(null);

  const { hasRole } = useAuth();

  useEffect(() => {
    loadBarns();
  }, []);

  async function loadBarns() {
    try {
      const data = await fetchApi<Barn[]>('/barns');
      setBarns(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const openCreateModal = () => {
    setEditingBarn(null);
    setFormData({
      code: `CH-${(barns.length + 1).toString().padStart(2, '0')}`,
      name: '',
      capacity: 3000,
      status: 'ACTIVE',
      description: '',
    });
    setShowModal(true);
  };

  const openEditModal = (barn: Barn) => {
    setEditingBarn(barn);
    setFormData({
      code: barn.code,
      name: barn.name,
      capacity: barn.capacity,
      status: barn.status,
      description: barn.description || '',
    });
    setShowModal(true);
  };

  const handleSaveBarn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBarn) {
        await fetchApi(`/barns/${editingBarn.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await fetchApi('/barns', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      setShowModal(false);
      loadBarns();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu chuồng nuôi');
    }
  };

  const handleDeleteBarn = async () => {
    if (!deletingBarn) return;
    try {
      await fetchApi(`/barns/${deletingBarn.id}`, {
        method: 'DELETE',
      });
      setDeletingBarn(null);
      loadBarns();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa chuồng nuôi');
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <PageHeader
          icon={Activity}
          title="Quản Lý Chuồng Nuôi"
          description="Kiểm tra sức chứa, mật độ nuôi và trạng thái bảo trì khu vực trang trại"
          action={
            hasRole(['ADMIN', 'FARM_MANAGER']) ? (
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Chuồng Mới</span>
              </button>
            ) : null
          }
        />

        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500">Đang tải danh sách chuồng nuôi...</div>
        ) : barns.length === 0 ? (
          <EmptyState
            icon={Building}
            title="Chưa có chuồng nuôi nào"
            description="Bấm 'Thêm chuồng mới' để cấu hình khu vực nuôi vịt trời"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {barns.map((barn) => {
              const occupancyRatio = Math.round((barn.current_occupancy / barn.capacity) * 100);
              const isOverloaded = occupancyRatio >= 95;

              return (
                <div key={barn.id} className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4 relative group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-brand-50 text-brand-500">
                        <Building className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">{barn.name}</h3>
                        <p className="font-mono text-xs text-slate-400">Mã: {barn.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                        {barn.status}
                      </span>
                      {hasRole(['ADMIN', 'FARM_MANAGER']) && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(barn)}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                            title="Sửa chuồng"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingBarn(barn)}
                            className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                            title="Xóa chuồng"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-600">Sức chứa sử dụng:</span>
                      <span className={`font-bold ${isOverloaded ? 'text-red-600' : 'text-slate-900'}`}>
                        {barn.current_occupancy.toLocaleString()} / {barn.capacity.toLocaleString()} ({occupancyRatio}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          isOverloaded ? 'bg-red-500' : occupancyRatio > 75 ? 'bg-amber-500' : 'bg-brand-500'
                        }`}
                        style={{ width: `${Math.min(100, occupancyRatio)}%` }}
                      ></div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {barn.description || 'Không có ghi chú mô tả chuồng nuôi'}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* CREATE / EDIT BARN MODAL */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <h3 className="font-bold text-slate-900 text-lg">
                  {editingBarn ? 'Chỉnh Sửa Chuồng Nuôi' : 'Thêm Chuồng Nuôi Mới'}
                </h3>
                <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <form onSubmit={handleSaveBarn} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên chuồng *</label>
                  <input
                    type="text"
                    required
                    placeholder="Chuồng Thịt B2..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Sức chứa tối đa (Con) *</label>
                    <input
                      type="number"
                      required
                      min={100}
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Trạng thái</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border bg-white"
                    >
                      <option value="ACTIVE">ACTIVE (Hoạt động)</option>
                      <option value="MAINTENANCE">MAINTENANCE (Bảo trì)</option>
                      <option value="INACTIVE">INACTIVE (Tạm ngưng)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mô tả thiết bị &amp; đặc điểm</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border"
                    placeholder="Thông tin hệ thống sưởi, hồ nước..."
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-brand-500 text-white font-bold"
                  >
                    {editingBarn ? 'Lưu Thay Đổi' : 'Lưu Chuồng Mới'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deletingBarn && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Xác Nhận Xóa Chuồng Nuôi</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Bạn có chắc chắn muốn xóa chuồng <span className="font-bold text-slate-800">{deletingBarn.name}</span> ({deletingBarn.code})?
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setDeletingBarn(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDeleteBarn}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                >
                  Xác Nhận Xóa
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
