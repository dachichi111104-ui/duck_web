'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { setAuthTokens, clearAuthTokens } from './api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isDemoMode: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  quickLogin: (role: UserRole) => Promise<boolean>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  isDemoMode: false,
  login: async () => false,
  quickLogin: async () => false,
  logout: () => {},
  hasRole: () => false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('access_token');
      const storedUserStr = localStorage.getItem('current_user');
      const isDemo = localStorage.getItem('is_demo_mode') === 'true';
      setIsDemoMode(isDemo);

      if (storedToken && storedUserStr) {
        setToken(storedToken);
        try {
          setUser(JSON.parse(storedUserStr));
        } catch {
          clearAuthTokens();
        }
      }
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Tên đăng nhập hoặc mật khẩu không đúng' }));
        throw new Error(err.detail || 'Đăng nhập thất bại');
      }

      const data = await res.json();
      setAuthTokens(data.access_token, data.refresh_token);
      setToken(data.access_token);
      setUser(data.user);
      setIsDemoMode(false);
      localStorage.setItem('current_user', JSON.stringify(data.user));
      localStorage.removeItem('is_demo_mode');
      return true;
    } catch (err: any) {
      // ONLY ALLOW DEMO MOCK FALLBACK LOGIN IF EXPLICITLY ENABLED BY NEXT_PUBLIC_DEMO_MODE=true
      if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
        const mockUsers: Record<string, User> = {
          admin: { id: 1, username: 'admin', email: 'admin@duckcare.ai', full_name: 'Nguyễn Văn Quản Trị (ADMIN)', role: 'ADMIN', is_active: true, created_at: '2026-01-01' },
          manager: { id: 2, username: 'manager', email: 'manager@duckcare.ai', full_name: 'Trần Thị Quản Lý (MANAGER)', role: 'FARM_MANAGER', is_active: true, created_at: '2026-01-01' },
          vet: { id: 3, username: 'vet', email: 'vet@duckcare.ai', full_name: 'BS. Lê Hoàng Thú Y (VET)', role: 'VETERINARIAN', is_active: true, created_at: '2026-01-01' },
          staff: { id: 4, username: 'staff', email: 'staff@duckcare.ai', full_name: 'Phạm Văn Nhân Viên (STAFF)', role: 'STAFF', is_active: true, created_at: '2026-01-01' },
        };
        const fallbackUser = mockUsers[username] || mockUsers['admin'];
        const mockToken = 'demo_jwt_token_for_' + fallbackUser.role;
        setAuthTokens(mockToken, mockToken);
        setToken(mockToken);
        setUser(fallbackUser);
        setIsDemoMode(true);
        localStorage.setItem('current_user', JSON.stringify(fallbackUser));
        localStorage.setItem('is_demo_mode', 'true');
        return true;
      }
      throw err;
    }
  };

  const quickLogin = async (role: UserRole): Promise<boolean> => {
    const roleMap: Record<UserRole, string> = {
      ADMIN: 'admin',
      FARM_MANAGER: 'manager',
      VETERINARIAN: 'vet',
      STAFF: 'staff',
    };
    return login(roleMap[role], 'password123');
  };

  const logout = () => {
    clearAuthTokens();
    setUser(null);
    setToken(null);
    setIsDemoMode(false);
    localStorage.removeItem('is_demo_mode');
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, isDemoMode, login, quickLogin, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
