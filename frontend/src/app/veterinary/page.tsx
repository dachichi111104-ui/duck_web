'use client';

import React, { useEffect, useState } from 'react';
import { Stethoscope, Syringe, AlertTriangle, Plus, CheckCircle2, Clock, X } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageHeader } from '@/components/PageHeader';
import { fetchApi } from '@/lib/api';
import { VetRecord, Vaccination, Disease } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';

export default function VeterinaryPage() {
  const [activeSubTab, setActiveSubTab] = useState<'records' | 'diseases' | 'vaccinations'>('records');
  const [records, setRecords] = useState<VetRecord[]>([]);
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [loading, setLoading] = useState(true);

  const { hasRole } = useAuth();

  useEffect(() => {
    loadVetData();
  }, []);

  async function loadVetData() {
    try {
      const [recs, dis, vacs] = await Promise.all([
        fetchApi<VetRecord[]>('/veterinary/records'),
        fetchApi<Disease[]>('/veterinary/diseases'),
        fetchApi<Vaccination[]>('/veterinary/vaccinations')
      ]);
      setRecords(recs || []);
      setDiseases(dis || []);
      setVaccinations(vacs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <PageHeader
          icon={Stethoscope}
          title="Quản Lý Thú Y &amp; Tiêm Phòng"
          description="Lưu trữ phác đồ điều trị bệnh án và quản lý lịch tiêm vắc xin định kỳ"
        />

        {/* Navigation Sub-Tabs */}
        <div className="flex border-b border-slate-200 text-xs font-bold gap-6">
          <button
            onClick={() => setActiveSubTab('records')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeSubTab === 'records' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Nhật Ký Bệnh Án</span>
          </button>

          <button
            onClick={() => setActiveSubTab('diseases')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeSubTab === 'diseases' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Danh Mục Bệnh Thường Gặp</span>
          </button>

          <button
            onClick={() => setActiveSubTab('vaccinations')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeSubTab === 'vaccinations' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Syringe className="w-4 h-4" />
            <span>Lịch Tiêm Phòng Vắc Xin</span>
          </button>
        </div>

        {/* SUB-TAB 1: VET RECORDS */}
        {activeSubTab === 'records' && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Đàn Vịt</th>
                    <th className="p-4">Chẩn Đoán Bệnh</th>
                    <th className="p-4">Số Con Nhiễm</th>
                    <th className="p-4">Phác Đồ Điều Trị</th>
                    <th className="p-4">Bác Sĩ Phụ Trách</th>
                    <th className="p-4">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-slate-900 text-sm">{rec.flock?.name || `Đàn #${rec.flock_id}`}</p>
                        <span className="text-[11px] text-slate-400">Ngày chẩn đoán: {rec.diagnosis_date}</span>
                      </td>
                      <td className="p-4 font-semibold text-slate-800">{rec.disease?.name || `Bệnh #${rec.disease_id}`}</td>
                      <td className="p-4 font-bold text-amber-600">{rec.affected_count} con</td>
                      <td className="p-4 max-w-xs leading-relaxed text-slate-700">{rec.treatment_plan}</td>
                      <td className="p-4 font-medium text-slate-800">{rec.veterinarian_name}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUB-TAB 2: DISEASES REFERENCE */}
        {activeSubTab === 'diseases' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {diseases.map((d) => (
              <div key={d.id} className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-base">{d.name}</h3>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    d.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {d.severity}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-slate-700 text-xs mb-1">Triệu chứng lâm sàng:</p>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">{d.symptoms}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-700 text-xs mb-1">Hướng điều trị &amp; Kháng sinh:</p>
                  <p className="text-xs text-emerald-800 leading-relaxed bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">{d.treatment}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SUB-TAB 3: VACCINATIONS */}
        {activeSubTab === 'vaccinations' && (
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Đàn Vịt</th>
                  <th className="p-4">Tên Vắc Xin</th>
                  <th className="p-4">Lịch Tiêm Dự Kiến</th>
                  <th className="p-4">Liều Lượng</th>
                  <th className="p-4">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vaccinations.map((vac) => (
                  <tr key={vac.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{vac.flock?.name || `Đàn #${vac.flock_id}`}</td>
                    <td className="p-4 font-semibold text-slate-800">{vac.vaccine_name}</td>
                    <td className="p-4 font-mono">{vac.scheduled_date}</td>
                    <td className="p-4">{vac.dosage}</td>
                    <td className="p-4">
                      {vac.status === 'COMPLETED' ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">Đã tiêm</span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">Sắp đến hạn</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
