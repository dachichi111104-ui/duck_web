'use client';

import React, { useEffect, useState } from 'react';
import { 
  Grid, Plus, Search, Eye, Edit, Trash2, X, 
  Activity, Egg, Syringe, Stethoscope, ChevronRight, Inbox 
} from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { fetchApi } from '@/lib/api';
import { Flock, Barn } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';

export default function FlocksPage() {
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [barns, setBarns] = useState<Barn[]>([]);
  const [search, setSearch] = useState('');
  const [selectedBarn, setSelectedBarn] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Detail Modal Tab state
  const [selectedFlock, setSelectedFlock] = useState<Flock | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'production' | 'vet'>('overview');

  // Form Modal state (Create / Edit)
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingFlock, setEditingFlock] = useState<Flock | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    barn_id: 1,
    initial_quantity: 1000,
    current_quantity: 1000,
    age_weeks: 1,
    status: 'GROWING' as 'BROODING' | 'GROWING' | 'LAYING' | 'COMPLETED',
    entry_date: new Date().toISOString().split('T')[0],
    description: '',
  });

  // Delete Confirm Modal
  const [deletingFlock, setDeletingFlock] = useState<Flock | null>(null);

  const { hasRole } = useAuth();

  useEffect(() => {
    loadData();
  }, [search, selectedBarn]);

  async function loadData() {
    try {
      let url = '/flocks?page=1&limit=50';
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (selectedBarn) url += `&barn_id=${selectedBarn}`;
      
      const [resFlocks, resBarns] = await Promise.all([
        fetchApi<{ data: Flock[] }>(url),
        fetchApi<Barn[]>('/barns')
      ]);
      setFlocks(resFlocks.data || []);
      setBarns(resBarns || []);
      if (resBarns && resBarns.length > 0) {
        setFormData(prev => ({ ...prev, barn_id: resBarns[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const openCreateModal = () => {
    setEditingFlock(null);
    setFormData({
      code: `FL-2026-${(flocks.length + 1).toString().padStart(2, '0')}`,
      name: '',
      barn_id: barns.length > 0 ? barns[0].id : 1,
      initial_quantity: 1000,
      current_quantity: 1000,
      age_weeks: 1,
      status: 'GROWING',
      entry_date: new Date().toISOString().split('T')[0],
      description: '',
    });
    setShowFormModal(true);
  };

  const openEditModal = (f: Flock) => {
    setEditingFlock(f);
    setFormData({
      code: f.code,
      name: f.name,
      barn_id: f.barn_id,
      initial_quantity: f.initial_quantity,
      current_quantity: f.current_quantity,
      age_weeks: f.age_weeks,
      status: f.status,
      entry_date: f.entry_date,
      description: f.description || '',
    });
    setShowFormModal(true);
  };

  const handleSaveFlock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFlock) {
        await fetchApi(`/flocks/${editingFlock.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        await fetchApi('/flocks', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }
      setShowFormModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu đàn vịt');
    }
  };

  const handleDeleteFlock = async () => {
    if (!deletingFlock) return;
    try {
      await fetchApi(`/flocks/${deletingFlock.id}`, {
        method: 'DELETE'
      });
      setDeletingFlock(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa đàn vịt');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BROODING': return <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">Úm vịt</span>;
      case 'GROWING': return <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">Nuôi thịt</span>;
      case 'LAYING': return <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">Đẻ trứng</span>;
      default: return <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">Hoàn thành</span>;
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <PageHeader
          icon={Grid}
          title="Quản Lý Đàn Vịt Trời"
          description="Danh sách tổng hợp các lứa nuôi, vị trí chuồng nuôi và sĩ số cá thể hiện tại"
          action={
            hasRole(['ADMIN', 'FARM_MANAGER']) ? (
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Đàn Vịt Mới</span>
              </button>
            ) : null
          }
        />

        {/* Search & Filter Bar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mã đàn vịt..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <select
            value={selectedBarn}
            onChange={(e) => setSelectedBarn(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Tất cả chuồng nuôi</option>
            {barns.map(b => (
              <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500">Đang tải danh sách đàn vịt...</div>
        ) : flocks.length === 0 ? (
          <EmptyState
            icon={Grid}
            title="Chưa có đàn vịt nào"
            description="Bấm 'Thêm đàn vịt mới' để khởi tạo lứa nuôi vịt trời mới cho trang trại"
          />
        ) : (
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Mã / Tên Đàn</th>
                    <th className="p-4">Chuồng Nuôi</th>
                    <th className="p-4">Sĩ Số</th>
                    <th className="p-4">Tuổi (Tuần)</th>
                    <th className="p-4">Trạng Thái</th>
                    <th className="p-4">Ngày Vào Trang Trại</th>
                    <th className="p-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {flocks.map((flock) => (
                    <tr key={flock.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-slate-900 text-sm">{flock.name}</p>
                        <span className="font-mono text-[11px] text-slate-400">{flock.code}</span>
                      </td>
                      <td className="p-4 font-medium text-slate-800">
                        {flock.barn?.name || `Chuồng #${flock.barn_id}`}
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-900">{flock.current_quantity.toLocaleString()}</span> con
                        <span className="text-[11px] text-slate-400 block">(Ban đầu: {flock.initial_quantity})</span>
                      </td>
                      <td className="p-4 font-semibold text-slate-800">{flock.age_weeks} tuần</td>
                      <td className="p-4">{getStatusBadge(flock.status)}</td>
                      <td className="p-4">{flock.entry_date}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedFlock(flock)}
                            className="px-2.5 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-600 font-semibold text-xs transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 inline mr-1" /> Chi tiết
                          </button>
                          {hasRole(['ADMIN', 'FARM_MANAGER']) && (
                            <>
                              <button
                                onClick={() => openEditModal(flock)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                                title="Sửa đàn vịt"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeletingFlock(flock)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"
                                title="Xóa đàn vịt"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CREATE / EDIT FLOCK MODAL */}
        {showFormModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b">
                <h3 className="font-bold text-slate-900 text-lg">
                  {editingFlock ? 'Chỉnh Sửa Đàn Vịt' : 'Tạo Đàn Vịt Trời Mới'}
                </h3>
                <button onClick={() => setShowFormModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <form onSubmit={handleSaveFlock} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên đàn vịt *</label>
                  <input
                    type="text"
                    required
                    placeholder="Đàn vịt giống F1 đợt mới..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Chuồng nuôi *</label>
                    <select
                      value={formData.barn_id}
                      onChange={(e) => setFormData({ ...formData, barn_id: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border bg-white"
                    >
                      {barns.map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Trạng thái lứa nuôi</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border bg-white"
                    >
                      <option value="BROODING">Úm vịt (BROODING)</option>
                      <option value="GROWING">Nuôi thịt (GROWING)</option>
                      <option value="LAYING">Đẻ trứng (LAYING)</option>
                      <option value="COMPLETED">Hoàn thành (COMPLETED)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Sĩ số ban đầu</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.initial_quantity}
                      onChange={(e) => setFormData({ ...formData, initial_quantity: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Sĩ số hiện tại</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={formData.current_quantity}
                      onChange={(e) => setFormData({ ...formData, current_quantity: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tuổi (Tuần)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.age_weeks}
                      onChange={(e) => setFormData({ ...formData, age_weeks: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ngày vào trang trại</label>
                    <input
                      type="date"
                      required
                      value={formData.entry_date}
                      onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ghi chú</label>
                    <input
                      type="text"
                      placeholder="Nguồn gốc giống, vắc xin..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-brand-500 text-white font-bold"
                  >
                    {editingFlock ? 'Lưu Thay Đổi' : 'Lưu Đàn Vịt'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE FLOCK CONFIRMATION MODAL */}
        {deletingFlock && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Xác Nhận Xóa Đàn Vịt</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Bạn có chắc muốn xóa <span className="font-bold text-slate-800">{deletingFlock.name}</span> ({deletingFlock.code})?
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setDeletingFlock(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDeleteFlock}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                >
                  Xác Nhận Xóa
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DETAIL TABS MODAL */}
        {selectedFlock && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <h3 className="font-bold text-slate-900 text-xl">{selectedFlock.name}</h3>
                  <p className="text-xs text-slate-500">Mã: {selectedFlock.code} | Vị trí: {selectedFlock.barn?.name}</p>
                </div>
                <button onClick={() => setSelectedFlock(null)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              {/* Modal Tabs */}
              <div className="flex border-b text-xs font-bold gap-4">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`pb-2 border-b-2 ${activeTab === 'overview' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500'}`}
                >
                  Tổng Quan
                </button>
                <button
                  onClick={() => setActiveTab('production')}
                  className={`pb-2 border-b-2 ${activeTab === 'production' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500'}`}
                >
                  Lịch Sử Sản Lượng
                </button>
                <button
                  onClick={() => setActiveTab('vet')}
                  className={`pb-2 border-b-2 ${activeTab === 'vet' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500'}`}
                >
                  Bệnh Án Thú Y
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50 space-y-2">
                    <p className="text-slate-500">Sĩ số hiện tại: <strong className="text-slate-900">{selectedFlock.current_quantity} con</strong></p>
                    <p className="text-slate-500">Sĩ số nhập ban đầu: <strong className="text-slate-900">{selectedFlock.initial_quantity} con</strong></p>
                    <p className="text-slate-500">Tuổi đàn: <strong className="text-slate-900">{selectedFlock.age_weeks} tuần</strong></p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 space-y-2">
                    <p className="text-slate-500">Trạng thái: {getStatusBadge(selectedFlock.status)}</p>
                    <p className="text-slate-500">Ngày nhập: <strong className="text-slate-900">{selectedFlock.entry_date}</strong></p>
                    <p className="text-slate-500">Ghi chú: {selectedFlock.description || 'Không có'}</p>
                  </div>
                </div>
              )}

              {activeTab === 'production' && (
                <p className="text-xs text-slate-500 py-6 text-center">
                  Đã ghi nhận nhật ký sản lượng trứng và tiêu thụ thức ăn. Xem chi tiết tại Phân hệ Báo cáo.
                </p>
              )}

              {activeTab === 'vet' && (
                <p className="text-xs text-slate-500 py-6 text-center">
                  Đang theo dõi sức khỏe thú y định kỳ. Không có diễn biến bất thường nguy cấp.
                </p>
              )}

            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
