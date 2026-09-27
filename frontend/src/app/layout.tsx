import './globals.css';
import React from 'react';
import { AuthProvider } from '@/lib/auth-context';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'DuckCare AI - Hệ thống Quản lý & Giám sát Vịt trời Thông minh',
  description: 'Hệ thống Web App độc lập hỗ trợ quản lý trang trại vịt trời và tích hợp AI nhận diện hành vi dự đoán bệnh sớm.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="bg-warmbg text-slate-800 antialiased min-h-screen flex flex-col">
        <AuthProvider>
          <Header />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
