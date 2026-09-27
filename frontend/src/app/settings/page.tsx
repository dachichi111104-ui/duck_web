'use client';

import React, { useState } from 'react';
import { Settings, ShieldCheck, Save, KeyRound, Building, Sliders, CheckCircle2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageHeader } from '@/components/PageHeader';

export default function SettingsPage() {
  const [farmName, setFarmName] = useState('Trại Vịt Trời NCKH Thực Nghiệm');
  const [aiThreshold, setAiThreshold] = useState('85');
  const [password, setPassword] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="space-y-6 max-w-4xl mx-auto">
        <PageHeader
          icon={Settings}
          title="Cài Đặt Hệ Thống &amp; Cấu Hình Trang Trại"
          description="Thiết lập thông tin trang trại, ngưỡng tin cậy phát hiện AI và bảo mật tài khoản (Dành riêng ADMIN)"
        />

        {saved && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Đã lưu cài đặt cấu hình hệ thống thành công!</span>
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-6">
          
          {/* Farm Information Section */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Building className="w-5 h-5 text-brand-500" />
              Thông Tin Trang Trại &amp; Đồ Án
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên Trang Trại / Đơn Vị Thử Nghiệm</label>
                <input
                  type="text"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phạm Vi Giám Sát</label>
                <input
                  type="text"
                  disabled
                  value="4 Chuồng Nuôi - 4 Đàn Vịt Trời Giống F1 &amp; Thương Phẩm"
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 text-slate-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* AI Detection Threshold Section */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-600" />
              Cấu Hình Ngưỡng Cảnh Báo AI YOLOv8
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>Ngưỡng độ tin cậy phát hiện (Confidence Threshold):</span>
                  <span className="text-brand-600 font-mono font-bold text-sm">{aiThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="99"
                  value={aiThreshold}
                  onChange={(e) => setAiThreshold(e.target.value)}
                  className="w-full accent-brand-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Các phát hiện có độ tin cậy dưới {aiThreshold}% sẽ được tự động lọc bỏ để giảm thiểu cảnh báo giả.
                </p>
              </div>
            </div>
          </div>

          {/* Password Change Section */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-500" />
              Bảo Mật Tài Khoản Quản Trị
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mật khẩu mới</label>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu mới nếu muốn thay đổi..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Tất Cả Cài Đặt</span>
            </button>
          </div>

        </form>
      </div>
    </ProtectedRoute>
  );
}
