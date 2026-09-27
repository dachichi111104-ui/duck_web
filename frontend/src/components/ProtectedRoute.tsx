'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3 text-slate-500">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        <p className="text-xs font-semibold">Đang xác thực thông tin tài khoản...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Don't render any protected API or DOM while redirecting
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="py-20 text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Quyền Truy Cập Bị Hạn Chế</h2>
        <p className="text-xs text-slate-500">
          Tài khoản vai trò <strong className="text-slate-800">{user.role}</strong> không có quyền truy cập trang này.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
