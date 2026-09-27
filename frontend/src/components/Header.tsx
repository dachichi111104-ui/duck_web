'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Bird, LayoutDashboard, Grid, Package, Stethoscope, 
  Scan, FileSpreadsheet, Users, LogOut, Cpu, Activity,
  Camera, History, Settings, Bell, Menu, X, ChevronDown, LogIn
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { fetchApi } from '@/lib/api';
import { Notification } from '@/lib/types';

export function Header() {
  const pathname = usePathname();
  const { user, logout, isDemoMode } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  async function loadNotifications() {
    try {
      const data = await fetchApi<Notification[]>('/notifications');
      setNotifications(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  const markRead = async (id: number) => {
    try {
      await fetchApi(`/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const primaryNav = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Đàn vịt', href: '/flocks', icon: Grid },
    { label: 'Camera AI', href: '/cameras', icon: Camera },
    { label: 'Nhận diện AI', href: '/ai', icon: Scan },
  ];

  const secondaryNav = [
    { label: 'Chuồng nuôi', href: '/barns', icon: Activity },
    { label: 'Kho vật tư', href: '/inventory', icon: Package },
    { label: 'Thú y', href: '/veterinary', icon: Stethoscope },
    { label: 'Báo cáo', href: '/reports', icon: FileSpreadsheet },
    { label: 'Lịch sử AI', href: '/history', icon: History },
  ];

  if (user && user.role === 'ADMIN') {
    secondaryNav.push({ label: 'Cài đặt', href: '/settings', icon: Settings });
    secondaryNav.push({ label: 'Người dùng', href: '/users', icon: Users });
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        
        {/* Left: Brand Logo & Title */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:bg-brand-600 transition-colors">
            <Bird className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-slate-900 group-hover:text-brand-500 transition-colors">
                DuckCare AI
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium leading-none hidden sm:block">
              Quản lý &amp; Giám sát Vịt trời
            </p>
          </div>
        </Link>

        {/* Center: Desktop Navigation Pill Buttons */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-100/90 p-1 rounded-full border border-slate-200/70">
          {primaryNav.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* More / Extra Dropdown for Secondary Navigation */}
          <div className="relative">
            <button
              onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                secondaryNav.some(n => pathname.startsWith(n.href))
                  ? 'bg-brand-500 text-white'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <span>Nghiệp vụ khác</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {moreDropdownOpen && (
              <div className="absolute left-0 mt-2 w-52 rounded-2xl bg-white border border-slate-200 shadow-2xl p-2 z-[100] space-y-1">
                {secondaryNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreDropdownOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                        isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-slate-500" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Right: AI Status Badge, Notifications & User */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* AI Status Badge */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Cpu className="w-3.5 h-3.5 text-emerald-600" />
            <span>AI: Online</span>
          </div>

          {/* Notification Bell Dropdown */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title="Thông báo"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border border-slate-200 shadow-2xl p-4 z-[100] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-brand-500" />
                      Thông báo mới nhất
                    </h4>
                    <span className="text-[10px] bg-brand-50 text-brand-700 font-bold px-2 py-0.5 rounded-full">
                      {unreadCount} chưa đọc
                    </span>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">Không có thông báo mới</p>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => markRead(n.id)}
                          className={`pt-2 cursor-pointer transition-colors ${n.is_read ? 'opacity-60' : 'font-semibold'}`}
                        >
                          <p className="text-xs text-slate-900">{n.title}</p>
                          <p className="text-[11px] text-slate-500 leading-normal">{n.message}</p>
                          <span className="text-[9px] text-slate-400 block mt-1">
                            {new Date(n.created_at).toLocaleTimeString('vi-VN')}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Profile or Login Button */}
          {user ? (
            <div className="flex items-center gap-1.5">
              <div className="text-right hidden md:block leading-tight">
                <p className="text-xs font-bold text-slate-800 max-w-[120px] truncate" title={user.full_name}>
                  {user.full_name}
                </p>
                <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wider">{user.role}</p>
              </div>
              <button
                onClick={logout}
                title="Đăng xuất"
                className="p-1.5 rounded-full bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-md transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập</span>
            </Link>
          )}

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

        </div>

      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-6 space-y-2 shadow-lg">
          {[...primaryNav, ...secondaryNav].map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
