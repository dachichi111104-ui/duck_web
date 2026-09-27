'use client';

import React, { useEffect, useState } from 'react';
import { Users, Plus, ShieldCheck, UserCheck, X } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageHeader } from '@/components/PageHeader';
import { fetchApi } from '@/lib/api';
import { User, UserRole } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: 'password123',
    role: 'STAFF' as UserRole,
  });

  const { hasRole } = useAuth();

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/users', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setShowModal(false);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Lỗi tạo người dùng');
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
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo tài khoản mới</span>
            </button>
          }
        />

        {/* Users Table */}
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Họ và Tên</th>
                <th className="p-4">Tên Đăng Nhập</th>
                <th className="p-4">Email</th>
                <th className="p-4">Vai Trò Hệ Thống</th>
                <th className="p-4">Trạng Thái</th>
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
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[10px]">
                      Hoạt động
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CREATE USER MODAL */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <h3 className="font-bold text-slate-900 text-lg">Tạo Tài Khoản Người Dùng Mới</h3>
                <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên đăng nhập</label>
                  <input
                    type="text"
                    required
                    placeholder="user_tech"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Họ và tên</label>
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
                  <label className="block font-bold text-slate-700 mb-1">Email liên hệ</label>
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
                    Lưu Tài Khoản
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
