'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ArrowRight, Scan, ShieldCheck, Database, Cpu, 
  Activity, Layers, Sparkles, CheckCircle2, ChevronRight, BarChart3, HeartPulse
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="space-y-12">
      {/* ===== HERO SECTION (MATCHING REFERENCE DESIGN IMAGE) ===== */}
      <section className="relative rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-slate-950 text-white p-8 sm:p-12 overflow-hidden shadow-2xl border border-brand-700/30">
        
        {/* Background Subtle Glow & Grid Accent */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Hero Left Content */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Top Pill Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/30 border border-brand-400/40 text-emerald-300 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Ứng dụng AI trong Nông nghiệp & Chăn nuôi Vịt trời</span>
            </div>

            {/* Title (2 lines) */}
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Ứng dụng AI Giám sát Hành vi &amp; <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-200">
                Quản lý Nông nghiệp Vịt trời
              </span>
            </h1>

            {/* Description with highlighted stats */}
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl font-light">
              Giải pháp toàn diện quản lý <strong className="text-emerald-400 font-semibold">4 đàn vịt với 10.550 con</strong>, 
              kết hợp mô hình AI phát hiện bệnh sớm qua hành vi di chuyển. Giúp nâng tỷ lệ phát hiện 
              bệnh sớm đạt trên <strong className="text-emerald-400 font-semibold">95%</strong> và giảm 
              <strong className="text-emerald-400 font-semibold"> 80% rủi ro lây nhiễm ổ dịch</strong>.
            </p>

            {/* Tech Tags */}
            <div className="flex flex-wrap gap-2 pt-1">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-500" />
                <span>Standard GLEC Compliance</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>PostgreSQL Async Database</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs">
                <Cpu className="w-3.5 h-3.5 text-golden" />
                <span>YOLOv8 Behavior Analysis</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 transition-all transform hover:-translate-y-0.5"
              >
                <Activity className="w-4 h-4" />
                <span>Vào hệ thống quản lý</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/ai"
                className="flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-slate-800/80 hover:bg-slate-800 text-white font-semibold text-sm border border-slate-700 hover:border-slate-600 transition-all"
              >
                <Scan className="w-4 h-4 text-emerald-400" />
                <span>Xem demo AI nhận diện</span>
              </Link>
            </div>
          </div>

          {/* Hero Right Dark Stats Card (Matching Reference Layout) */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 backdrop-blur-xl shadow-2xl space-y-5">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  THÔNG SỐ DỮ LIỆU ĐƯA VÀO
                </span>
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Realtime Sync
                </span>
              </div>

              {/* Highlight Stats Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-1">Tổng đàn quản lý</p>
                  <p className="text-3xl font-extrabold text-white">4 đàn</p>
                  <p className="text-[11px] text-emerald-400 mt-1">Chuồng A1, B1, C1, D1</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-1">Tổng số vịt</p>
                  <p className="text-3xl font-extrabold text-white">10.550</p>
                  <p className="text-[11px] text-slate-400 mt-1">Giống, Thịt &amp; Đẻ</p>
                </div>
              </div>

              {/* Alert Metrics Box */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Cảnh báo hôm nay</p>
                  <p className="text-lg font-bold text-amber-400">2 cá thể ủ rũ</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30">
                  Cần kiểm tra
                </span>
              </div>

              {/* Scope Box */}
              <div className="p-4 rounded-xl bg-brand-950/50 border border-brand-800/60 text-xs text-slate-300 space-y-1">
                <p className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Vùng hoạt động / Phạm vi trang trại
                </p>
                <p className="text-slate-400 leading-normal">
                  Trại thực nghiệm NCKH - 4 Chuồng nuôi với hệ thống camera AI 24/7 scanning tự động.
                </p>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ===== SYSTEM FEATURE MODULES ===== */}
      <section className="space-y-6">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Các Phân Hệ Quản Lý Chăn Nuôi Chuyên Nghiệp
          </h2>
          <p className="text-slate-600 text-sm">
            Giao diện thiết kế theo Design System chuẩn NCKH — Hiện đại, sang trọng, trực quan cho hội đồng và nhà đầu tư.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-3 group">
            <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center group-hover:bg-brand-500 group-hover:text-white transition-colors">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Quản lý Đàn &amp; Chuồng</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Theo dõi biến động sĩ số, số lượng nhập/xuất, lứa tuổi và kiểm tra tự động giới hạn sức chứa chuồng.
            </p>
            <Link href="/flocks" className="inline-flex items-center gap-1 text-xs font-bold text-brand-500 hover:text-brand-600">
              Chi tiết phân hệ <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-3 group">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Sản Lượng &amp; Biểu Đồ</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ghi nhận sản lượng trứng hàng ngày, tỷ lệ tiêu thụ thức ăn (FCR) và biểu đồ xu hướng trực quan.
            </p>
            <Link href="/reports" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700">
              Chi tiết phân hệ <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-3 group">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <HeartPulse className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Thú Y &amp; Tiêm Phòng</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Lưu trữ bệnh án, phác đồ điều trị, lịch tiêm vắc xin và phát cảnh báo nhắc nhở khi đến hạn.
            </p>
            <Link href="/veterinary" className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700">
              Chi tiết phân hệ <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-3 group">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Scan className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Nhận Diện AI 24/7</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Phân tích video stream, vẽ overlay bounding box màu theo trạng thái (Bình thường, Ủ rũ, Tách đàn).
            </p>
            <Link href="/ai" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700">
              Chi tiết phân hệ <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </section>

      {/* ===== INDEPENDENT DEMO NOTE BANNER ===== */}
      <section className="p-6 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-brand-500 text-white shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">Ghi Chú Đồ Án Web App Independent Demo</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Đây là bản Web App độc lập dùng để DEMO trước hội đồng chấm đồ án (không thay thế bản Desktop, không đồng bộ dữ liệu 2 chiều). 
              Mục đích minh họa kiến trúc Web RESTful API mở rộng multi-user/multi-farm trong tương lai.
            </p>
          </div>
        </div>
        <Link
          href="/login"
          className="shrink-0 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
        >
          Đăng nhập Demo ngay
        </Link>
      </section>
    </div>
  );
}
