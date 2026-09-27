'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bird, KeyRound, UserCheck, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { UserRole } from '@/lib/types';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, quickLogin } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      const ok = await login(username, password);
      if (ok) {
        router.push('/dashboard');
      } else {
        setErrorMsg('Tên đăng nhập hoặc mật khẩu không đúng');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Đăng nhập thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (role: UserRole) => {
    setErrorMsg('');
    setSubmitting(true);
    try {
      const ok = await quickLogin(role);
      if (ok) {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setErrorMsg('Đăng nhập nhanh thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xl space-y-6">
      
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-brand-500 mx-auto flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
          <Bird className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Đăng Nhập Hệ Thống</h2>
        <p className="text-xs text-slate-500">
          Hệ thống Quản lý &amp; Giám sát Vịt trời DuckCare AI
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium text-center">
          {errorMsg}
        </div>
      )}

      {/* Main Login Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Tên đăng nhập</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            placeholder="Nhập tên đăng nhập"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Mật khẩu</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            placeholder="Nhập mật khẩu"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
        >
          <span>{submitting ? 'Đang đăng nhập...' : 'Đăng nhập vào hệ thống'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Quick Login Section for Presentation Demo */}
      <div className="pt-4 border-t border-slate-200/80 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <UserCheck className="w-4 h-4 text-brand-500" />
          <span>Đăng Nhập Nhanh Cho Demo Hoi Đồng</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleQuickLogin('ADMIN')}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-brand-50 border border-slate-200 text-left transition-colors group"
          >
            <p className="text-xs font-bold text-slate-800 group-hover:text-brand-600">Quản trị viên</p>
            <p className="text-[10px] text-slate-500">Role: ADMIN</p>
          </button>

          <button
            onClick={() => handleQuickLogin('FARM_MANAGER')}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-brand-50 border border-slate-200 text-left transition-colors group"
          >
            <p className="text-xs font-bold text-slate-800 group-hover:text-brand-600">Quản lý Trang trại</p>
            <p className="text-[10px] text-slate-500">Role: FARM_MANAGER</p>
          </button>

          <button
            onClick={() => handleQuickLogin('VETERINARIAN')}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-brand-50 border border-slate-200 text-left transition-colors group"
          >
            <p className="text-xs font-bold text-slate-800 group-hover:text-brand-600">Bác sĩ Thú y</p>
            <p className="text-[10px] text-slate-500">Role: VETERINARIAN</p>
          </button>

          <button
            onClick={() => handleQuickLogin('STAFF')}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-brand-50 border border-slate-200 text-left transition-colors group"
          >
            <p className="text-xs font-bold text-slate-800 group-hover:text-brand-600">Nhân viên Trang trại</p>
            <p className="text-[10px] text-slate-500">Role: STAFF</p>
          </button>
        </div>
      </div>

    </div>
  );
}
