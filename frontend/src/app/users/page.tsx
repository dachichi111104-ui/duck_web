'use client';

import React, { useEffect, useState } from 'react';
import { Users, Plus, Edit, Trash2, X } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageHeader } from '@/components/PageHeader';
import { fetchApi } from '@/lib/api';
import { User, UserRole } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role: 'STAFF' as UserRole,
    is_active: true,
  });

  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const { hasRole, user: currentUser } = useAuth();

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const data = await fetchApi<User[]>('/users');
      setUsers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      email: '',
      full_name: '',
      password: 'password123',
      role: 'STAFF',
      is_active: true,
    });
    setShowModal(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setFormData({
      username: u.username,
      email: u.email,
      full_name: u.full_name,
      password: '', // Keep empty if not changing password
      role: u.role,
      is_active: u.is_active,
    });
    setShowModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Send PUT payload
        const payload: any = {
          full_name: formData.full_name,
          email: formData.email,
          role: formData.role,
          is_active: formData.is_active,
        };
        if (formData.password) {
          payload.password = formData.password;
        }
        await fetchApi(`/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/users', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      setShowModal(false);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Lỗi lưu thông tin người dùng');
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      await fetchApi(`/users/${deletingUser.id}`, {
        method: 'DELETE',
      });
      setDeletingUser(null);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa người dùng');
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">Quản trị viên (ADMIN)</span>;
      case 'FARM_MANAGER': return <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">Quản lý trại (MANAGER)</span>;
      case 'VETERINARIAN': return <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">Thú y (VET)</span>;
      default: return <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">Nhân viên (STAFF)</span>;
    }
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="space-y-6">
        <PageHeader
          icon={Users}
          title="Quản Lý Người Dùng &amp; Phân Quyền"
          description="Quản lý danh sách tài khoản truy cập hệ thống và gán vai trò quyền hạn (Dành riêng ADMIN)"
          action={
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Tài Khoản Mới</span>
            </button>
          }
        />

        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500">Đang tải danh sách tài khoản...</div>
        ) : (
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Họ và Tên</th>
                  <th className="p-4">Tên Đăng Nhập</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Vai Trò Hệ Thống</th>
                  <th className="p-4">Trạng Thái</th>
                  <th className="p-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-900 text-sm">{u.full_name}</td>
                    <td className="p-4 font-mono font-bold text-slate-700">{u.username}</td>
                    <td className="p-4">{u.email}</td>
                    <td className="p-4">{getRoleBadge(u.role)}</td>
                    <td className="p-4">
                      {u.is_active ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[10px] border border-emerald-200">
                          Hoạt động
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold text-[10px] border">
                          Đã khóa
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                          title="Sửa tài khoản"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {currentUser?.username !== u.username && (
                          <button
                            onClick={() => setDeletingUser(u)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"
                            title="Xóa tài khoản"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* CREATE / EDIT USER MODAL */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <h3 className="font-bold text-slate-900 text-lg">
                  {editingUser ? 'Chỉnh Sửa Người Dùng' : 'Tạo Tài Khoản Mới'}
                </h3>
                <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên đăng nhập *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingUser}
                    placeholder="user_tech"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A..."
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email liên hệ *</label>
                  <input
                    type="email"
                    required
                    placeholder="user@duckcare.ai"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {editingUser ? 'Mật khẩu mới (Để trống nếu giữ nguyên)' : 'Mật khẩu khởi tạo *'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Vai trò phân quyền</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                      className="w-full px-3 py-2 rounded-xl border bg-white"
                    >
                      <option value="STAFF">Nhân viên (STAFF)</option>
                      <option value="VETERINARIAN">Bác sĩ Thú y (VETERINARIAN)</option>
                      <option value="FARM_MANAGER">Quản lý trang trại (FARM_MANAGER)</option>
                      <option value="ADMIN">Quản trị viên (ADMIN)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Trạng thái tài khoản</label>
                    <select
                      value={formData.is_active ? 'true' : 'false'}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                      className="w-full px-3 py-2 rounded-xl border bg-white"
                    >
                      <option value="true">Kích hoạt</option>
                      <option value="false">Tạm khóa</option>
                    </select>
                  </div>
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
                    {editingUser ? 'Lưu Thay Đổi' : 'Tạo Tài Khoản'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deletingUser && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Xác Nhận Xóa Tài Khoản</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Bạn có chắc chắn muốn xóa người dùng <span className="font-bold text-slate-800">{deletingUser.full_name}</span> ({deletingUser.username}) khỏi hệ thống?
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setDeletingUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDeleteUser}
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
