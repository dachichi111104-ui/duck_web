'use client';

import React, { useEffect, useState } from 'react';
import { Camera, Plus, Video, Radio, Edit, Trash2, X } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { fetchApi } from '@/lib/api';
import { Camera as CameraType, Barn } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';

export default function CamerasPage() {
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [barns, setBarns] = useState<Barn[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingCamera, setEditingCamera] = useState<CameraType | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    location: '',
    barn_id: 1,
    status: 'ONLINE',
    rtsp_url: '',
  });

  const [deletingCamera, setDeletingCamera] = useState<CameraType | null>(null);

  const { hasRole } = useAuth();

  useEffect(() => {
    loadCameras();
  }, []);

  async function loadCameras() {
    try {
      const [cams, bns] = await Promise.all([
        fetchApi<CameraType[]>('/cameras'),
        fetchApi<Barn[]>('/barns'),
      ]);
      setCameras(cams || []);
      setBarns(bns || []);
      if (bns && bns.length > 0) {
        setFormData(prev => ({ ...prev, barn_id: bns[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const openCreateModal = () => {
    setEditingCamera(null);
    setFormData({
      code: `CAM-${(cameras.length + 1).toString().padStart(2, '0')}`,
      name: '',
      location: '',
      barn_id: barns.length > 0 ? barns[0].id : 1,
      status: 'ONLINE',
      rtsp_url: '',
    });
    setShowModal(true);
  };

  const openEditModal = (cam: CameraType) => {
    setEditingCamera(cam);
    setFormData({
      code: cam.code || `CAM-${cam.id}`,
      name: cam.name,
      location: cam.location || '',
      barn_id: cam.barn_id,
      status: cam.status,
      rtsp_url: cam.rtsp_url || '',
    });
    setShowModal(true);
  };

  const handleSaveCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCamera) {
        await fetchApi(`/cameras/${editingCamera.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await fetchApi('/cameras', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      setShowModal(false);
      loadCameras();
    } catch (err: any) {
      alert(err.message || 'Lỗi lưu thông tin camera');
    }
  };

  const handleDeleteCamera = async () => {
    if (!deletingCamera) return;
    try {
      await fetchApi(`/cameras/${deletingCamera.id}`, {
        method: 'DELETE',
      });
      setDeletingCamera(null);
      loadCameras();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa camera');
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <PageHeader
          icon={Camera}
          title="Quản Lý Camera Giám Sát"
          description="Danh sách camera CCTV lắp đặt tại các chuồng nuôi, hỗ trợ xem luồng stream RTSP & nhận diện AI"
          action={
            hasRole(['ADMIN', 'FARM_MANAGER']) ? (
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Camera Mới</span>
              </button>
            ) : null
          }
        />

        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500">Đang tải danh sách camera...</div>
        ) : cameras.length === 0 ? (
          <EmptyState
            icon={Camera}
            title="Chưa có camera giám sát nào"
            description="Thêm camera mới gắn với chuồng nuôi để nhận dạng luồng nhận diện AI"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cameras.map((cam) => (
              <div key={cam.id} className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4 relative group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-slate-100 text-slate-700">
                      <Video className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{cam.name}</h3>
                      <p className="text-xs text-slate-500">Khu vực: {cam.barn?.name || `Chuồng #${cam.barn_id}`}</p>
                      {cam.location && <p className="text-[11px] text-slate-400">Vị trí: {cam.location}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                      cam.status === 'ONLINE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      <Radio className="w-3 h-3" />
                      {cam.status}
                    </span>
                    {hasRole(['ADMIN', 'FARM_MANAGER']) && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(cam)}
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                          title="Sửa camera"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingCamera(cam)}
                          className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          title="Xóa camera"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 font-mono text-[11px] text-slate-600 truncate">
                  RTSP: {cam.rtsp_url || 'Chưa cấu hình URL'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODAL CREATE / EDIT CAMERA */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <h3 className="font-bold text-slate-900 text-lg">
                  {editingCamera ? 'Chỉnh Sửa Camera' : 'Thêm Camera Mới'}
                </h3>
                <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <form onSubmit={handleSaveCamera} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trạng thái</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border bg-white"
                  >
                    <option value="ONLINE">ONLINE (Đang hoạt động)</option>
                    <option value="OFFLINE">OFFLINE (Mất kết nối)</option>
                    <option value="MAINTENANCE">MAINTENANCE (Bảo trì)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên Camera *</label>
                  <input
                    type="text"
                    required
                    placeholder="Cam 05 - Góc Chuồng Úm..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gắn vào Chuồng Nuôi *</label>
                  <select
                    value={formData.barn_id}
                    onChange={(e) => setFormData({ ...formData, barn_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border bg-white"
                  >
                    {barns.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vị trí lắp đặt chi tiết</label>
                  <input
                    type="text"
                    placeholder="Góc Tây Nam chuồng A1..."
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">RTSP Stream URL</label>
                  <input
                    type="text"
                    placeholder="rtsp://192.168.1.105:554/stream1"
                    value={formData.rtsp_url}
                    onChange={(e) => setFormData({ ...formData, rtsp_url: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border"
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
                    {editingCamera ? 'Lưu Thay Đổi' : 'Lưu Camera'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deletingCamera && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Xác Nhận Xóa Camera</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Bạn có chắc chắn muốn xóa camera <span className="font-bold text-slate-800">{deletingCamera.name}</span> khỏi hệ thống?
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setDeletingCamera(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDeleteCamera}
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
