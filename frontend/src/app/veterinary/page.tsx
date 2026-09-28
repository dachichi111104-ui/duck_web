'use client';

import React, { useEffect, useState } from 'react';
import { Stethoscope, Syringe, AlertTriangle, Plus, Edit, Trash2, X } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageHeader } from '@/components/PageHeader';
import { fetchApi } from '@/lib/api';
import { VetRecord, Vaccination, Disease, Flock } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';

export default function VeterinaryPage() {
  const [activeSubTab, setActiveSubTab] = useState<'records' | 'diseases' | 'vaccinations'>('records');
  const [records, setRecords] = useState<VetRecord[]>([]);
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals for Records
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<VetRecord | null>(null);
  const [recordForm, setRecordForm] = useState({
    flock_id: 1,
    disease_id: 1,
    diagnosis_date: new Date().toISOString().split('T')[0],
    status: 'TREATING' as 'MONITORING' | 'TREATING' | 'RECOVERED' | 'CULLED',
    affected_count: 10,
    treatment_plan: '',
    veterinarian_name: '',
    notes: '',
  });

  // Modals for Diseases
  const [showDiseaseModal, setShowDiseaseModal] = useState(false);
  const [editingDisease, setEditingDisease] = useState<Disease | null>(null);
  const [diseaseForm, setDiseaseForm] = useState({
    code: '',
    name: '',
    symptoms: '',
    treatment: '',
    severity: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  });

  // Modals for Vaccinations
  const [showVaccinationModal, setShowVaccinationModal] = useState(false);
  const [editingVaccination, setEditingVaccination] = useState<Vaccination | null>(null);
  const [vaccinationForm, setVaccinationForm] = useState({
    flock_id: 1,
    vaccine_name: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    status: 'SCHEDULED' as 'SCHEDULED' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED',
    dosage: '1ml/con',
    notes: '',
  });

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'record' | 'disease' | 'vaccination'; id: number; name: string } | null>(null);

  const { hasRole } = useAuth();

  useEffect(() => {
    loadVetData();
  }, []);

  async function loadVetData() {
    try {
      const [recs, dis, vacs, flks] = await Promise.all([
        fetchApi<VetRecord[]>('/veterinary/records'),
        fetchApi<Disease[]>('/veterinary/diseases'),
        fetchApi<Vaccination[]>('/veterinary/vaccinations'),
        fetchApi<Flock[]>('/flocks'),
      ]);
      setRecords(recs || []);
      setDiseases(dis || []);
      setVaccinations(vacs || []);
      setFlocks(flks || []);

      if (flks && flks.length > 0) {
        setRecordForm(prev => ({ ...prev, flock_id: flks[0].id }));
        setVaccinationForm(prev => ({ ...prev, flock_id: flks[0].id }));
      }
      if (dis && dis.length > 0) {
        setRecordForm(prev => ({ ...prev, disease_id: dis[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Record CRUD
  const openCreateRecordModal = () => {
    setEditingRecord(null);
    setRecordForm({
      flock_id: flocks.length > 0 ? flocks[0].id : 1,
      disease_id: diseases.length > 0 ? diseases[0].id : 1,
      diagnosis_date: new Date().toISOString().split('T')[0],
      status: 'TREATING',
      affected_count: 10,
      treatment_plan: '',
      veterinarian_name: '',
      notes: '',
    });
    setShowRecordModal(true);
  };

  const openEditRecordModal = (rec: VetRecord) => {
    setEditingRecord(rec);
    setRecordForm({
      flock_id: rec.flock_id,
      disease_id: rec.disease_id,
      diagnosis_date: rec.diagnosis_date,
      status: rec.status,
      affected_count: rec.affected_count,
      treatment_plan: rec.treatment_plan,
      veterinarian_name: rec.veterinarian_name,
      notes: rec.notes || '',
    });
    setShowRecordModal(true);
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRecord) {
        await fetchApi(`/veterinary/records/${editingRecord.id}`, {
          method: 'PUT',
          body: JSON.stringify(recordForm),
        });
      } else {
        await fetchApi('/veterinary/records', {
          method: 'POST',
          body: JSON.stringify(recordForm),
        });
      }
      setShowRecordModal(false);
      loadVetData();
    } catch (err: any) {
      alert(err.message || 'Lỗi lưu bệnh án');
    }
  };

  // Disease CRUD
  const openCreateDiseaseModal = () => {
    setEditingDisease(null);
    setDiseaseForm({
      code: `DIS-${(diseases.length + 1).toString().padStart(2, '0')}`,
      name: '',
      symptoms: '',
      treatment: '',
      severity: 'MEDIUM',
    });
    setShowDiseaseModal(true);
  };

  const openEditDiseaseModal = (d: Disease) => {
    setEditingDisease(d);
    setDiseaseForm({
      code: d.code,
      name: d.name,
      symptoms: d.symptoms,
      treatment: d.treatment,
      severity: d.severity,
    });
    setShowDiseaseModal(true);
  };

  const handleSaveDisease = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDisease) {
        await fetchApi(`/veterinary/diseases/${editingDisease.id}`, {
          method: 'PUT',
          body: JSON.stringify(diseaseForm),
        });
      } else {
        await fetchApi('/veterinary/diseases', {
          method: 'POST',
          body: JSON.stringify(diseaseForm),
        });
      }
      setShowDiseaseModal(false);
      loadVetData();
    } catch (err: any) {
      alert(err.message || 'Lỗi lưu danh mục bệnh');
    }
  };

  // Vaccination CRUD
  const openCreateVaccinationModal = () => {
    setEditingVaccination(null);
    setVaccinationForm({
      flock_id: flocks.length > 0 ? flocks[0].id : 1,
      vaccine_name: '',
      scheduled_date: new Date().toISOString().split('T')[0],
      status: 'SCHEDULED',
      dosage: '1ml/con',
      notes: '',
    });
    setShowVaccinationModal(true);
  };

  const openEditVaccinationModal = (v: Vaccination) => {
    setEditingVaccination(v);
    setVaccinationForm({
      flock_id: v.flock_id,
      vaccine_name: v.vaccine_name,
      scheduled_date: v.scheduled_date,
      status: v.status,
      dosage: v.dosage,
      notes: v.notes || '',
    });
    setShowVaccinationModal(true);
  };

  const handleSaveVaccination = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingVaccination) {
        await fetchApi(`/veterinary/vaccinations/${editingVaccination.id}`, {
          method: 'PUT',
          body: JSON.stringify(vaccinationForm),
        });
      } else {
        await fetchApi('/veterinary/vaccinations', {
          method: 'POST',
          body: JSON.stringify(vaccinationForm),
        });
      }
      setShowVaccinationModal(false);
      loadVetData();
    } catch (err: any) {
      alert(err.message || 'Lỗi lưu lịch tiêm vắc xin');
    }
  };

  // Perform Deletion
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'record') {
        await fetchApi(`/veterinary/records/${deleteTarget.id}`, { method: 'DELETE' });
      } else if (deleteTarget.type === 'disease') {
        await fetchApi(`/veterinary/diseases/${deleteTarget.id}`, { method: 'DELETE' });
      } else if (deleteTarget.type === 'vaccination') {
        await fetchApi(`/veterinary/vaccinations/${deleteTarget.id}`, { method: 'DELETE' });
      }
      setDeleteTarget(null);
      loadVetData();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa mục đã chọn');
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <PageHeader
          icon={Stethoscope}
          title="Quản Lý Thú Y &amp; Tiêm Phòng"
          description="Lưu trữ phác đồ điều trị bệnh án và quản lý lịch tiêm vắc xin định kỳ"
          action={
            hasRole(['ADMIN', 'FARM_MANAGER', 'VETERINARIAN']) ? (
              activeSubTab === 'records' ? (
                <button
                  onClick={openCreateRecordModal}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo Bệnh Án Mới</span>
                </button>
              ) : activeSubTab === 'diseases' ? (
                <button
                  onClick={openCreateDiseaseModal}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Bệnh Mới</span>
                </button>
              ) : (
                <button
                  onClick={openCreateVaccinationModal}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo Lịch Tiêm Mới</span>
                </button>
              )
            ) : null
          }
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
                    <th className="p-4 text-right">Thao Tác</th>
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
                      <td className="p-4 text-right">
                        {hasRole(['ADMIN', 'FARM_MANAGER', 'VETERINARIAN']) && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditRecordModal(rec)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                              title="Sửa bệnh án"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ type: 'record', id: rec.id, name: `Bệnh án #${rec.id}` })}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"
                              title="Xóa bệnh án"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
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
              <div key={d.id} className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3 relative group">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{d.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      d.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {d.severity}
                    </span>
                    {hasRole(['ADMIN', 'FARM_MANAGER', 'VETERINARIAN']) && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditDiseaseModal(d)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                          title="Sửa bệnh"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ type: 'disease', id: d.id, name: d.name })}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"
                          title="Xóa bệnh"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
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
                  <th className="p-4 text-right">Thao Tác</th>
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
                        <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">{vac.status}</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {hasRole(['ADMIN', 'FARM_MANAGER', 'VETERINARIAN']) && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditVaccinationModal(vac)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                            title="Sửa lịch tiêm"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: 'vaccination', id: vac.id, name: vac.vaccine_name })}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"
                            title="Xóa lịch tiêm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* MODAL: VET RECORD (CREATE / EDIT) */}
        {showRecordModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b">
                <h3 className="font-bold text-slate-900 text-lg">
                  {editingRecord ? 'Chỉnh Sửa Bệnh Án' : 'Tạo Bệnh Án Mới'}
                </h3>
                <button onClick={() => setShowRecordModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <form onSubmit={handleSaveRecord} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Chọn Đàn Vịt *</label>
                    <select
                      value={recordForm.flock_id}
                      onChange={(e) => setRecordForm({ ...recordForm, flock_id: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border bg-white"
                    >
                      {flocks.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Loại Bệnh Chẩn Đoán *</label>
                    <select
                      value={recordForm.disease_id}
                      onChange={(e) => setRecordForm({ ...recordForm, disease_id: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border bg-white"
                    >
                      {diseases.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ngày Chẩn Đoán</label>
                    <input
                      type="date"
                      required
                      value={recordForm.diagnosis_date}
                      onChange={(e) => setRecordForm({ ...recordForm, diagnosis_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Số Con Nhiễm</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={recordForm.affected_count}
                      onChange={(e) => setRecordForm({ ...recordForm, affected_count: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Trạng Thái</label>
                    <select
                      value={recordForm.status}
                      onChange={(e) => setRecordForm({ ...recordForm, status: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border bg-white"
                    >
                      <option value="MONITORING">Theo dõi</option>
                      <option value="TREATING">Đang điều trị</option>
                      <option value="RECOVERED">Đã khỏi</option>
                      <option value="CULLED">Đã tiêu hủy</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bác Sĩ Phụ Trách</label>
                  <input
                    type="text"
                    required
                    placeholder="Bác sĩ Thú y..."
                    value={recordForm.veterinarian_name}
                    onChange={(e) => setRecordForm({ ...recordForm, veterinarian_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phác Đồ Điều Trị &amp; Thuốc Dùng</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Tiêm Amoxicillin + Vitamin C trong 5 ngày..."
                    value={recordForm.treatment_plan}
                    onChange={(e) => setRecordForm({ ...recordForm, treatment_plan: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRecordModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                  >
                    Hủy
                  </button>
                  <button type="submit" className="px-5 py-2 rounded-xl bg-brand-500 text-white font-bold">
                    {editingRecord ? 'Lưu Bệnh Án' : 'Tạo Bệnh Án'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: DISEASE (CREATE / EDIT) */}
        {showDiseaseModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b">
                <h3 className="font-bold text-slate-900 text-lg">
                  {editingDisease ? 'Chỉnh Sửa Loại Bệnh' : 'Thêm Loại Bệnh Mới'}
                </h3>
                <button onClick={() => setShowDiseaseModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <form onSubmit={handleSaveDisease} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mức độ nghiêm trọng</label>
                  <select
                    value={diseaseForm.severity}
                    onChange={(e) => setDiseaseForm({ ...diseaseForm, severity: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border bg-white"
                  >
                    <option value="LOW">Nhẹ (LOW)</option>
                    <option value="MEDIUM">Vừa (MEDIUM)</option>
                    <option value="HIGH">Nặng (HIGH)</option>
                    <option value="CRITICAL">Nguy hiểm (CRITICAL)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên bệnh *</label>
                  <input
                    type="text"
                    required
                    placeholder="Bệnh Dịch Tả Vịt..."
                    value={diseaseForm.name}
                    onChange={(e) => setDiseaseForm({ ...diseaseForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Triệu chứng lâm sàng *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Vịt tiêu chảy phân xanh, chảy nước mắt..."
                    value={diseaseForm.symptoms}
                    onChange={(e) => setDiseaseForm({ ...diseaseForm, symptoms: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hướng điều trị đề xuất *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Kháng thể Dịch tả + Kháng sinh chống nhiễm trùng..."
                    value={diseaseForm.treatment}
                    onChange={(e) => setDiseaseForm({ ...diseaseForm, treatment: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDiseaseModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                  >
                    Hủy
                  </button>
                  <button type="submit" className="px-5 py-2 rounded-xl bg-brand-500 text-white font-bold">
                    {editingDisease ? 'Lưu Bệnh' : 'Thêm Bệnh'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: VACCINATION (CREATE / EDIT) */}
        {showVaccinationModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b">
                <h3 className="font-bold text-slate-900 text-lg">
                  {editingVaccination ? 'Chỉnh Sửa Lịch Tiêm' : 'Tạo Lịch Tiêm Vắc Xin Mới'}
                </h3>
                <button onClick={() => setShowVaccinationModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <form onSubmit={handleSaveVaccination} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chọn Đàn Vịt *</label>
                  <select
                    value={vaccinationForm.flock_id}
                    onChange={(e) => setVaccinationForm({ ...vaccinationForm, flock_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border bg-white"
                  >
                    {flocks.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên Vắc Xin *</label>
                  <input
                    type="text"
                    required
                    placeholder="Vắc xin Cúm H5N1..."
                    value={vaccinationForm.vaccine_name}
                    onChange={(e) => setVaccinationForm({ ...vaccinationForm, vaccine_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Lịch Tiêm Dự Kiến</label>
                    <input
                      type="date"
                      required
                      value={vaccinationForm.scheduled_date}
                      onChange={(e) => setVaccinationForm({ ...vaccinationForm, scheduled_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Trạng Thái</label>
                    <select
                      value={vaccinationForm.status}
                      onChange={(e) => setVaccinationForm({ ...vaccinationForm, status: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border bg-white"
                    >
                      <option value="SCHEDULED">Lên lịch</option>
                      <option value="COMPLETED">Đã tiêm</option>
                      <option value="OVERDUE">Quá hạn</option>
                      <option value="CANCELLED">Hủy bỏ</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Liều Lượng Chỉ Định</label>
                  <input
                    type="text"
                    required
                    placeholder="0.5ml / con tiêm dưới da..."
                    value={vaccinationForm.dosage}
                    onChange={(e) => setVaccinationForm({ ...vaccinationForm, dosage: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowVaccinationModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                  >
                    Hủy
                  </button>
                  <button type="submit" className="px-5 py-2 rounded-xl bg-brand-500 text-white font-bold">
                    {editingVaccination ? 'Lưu Lịch Tiêm' : 'Tạo Lịch Tiêm'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Xác Nhận Xóa</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Bạn có chắc muốn xóa <span className="font-bold text-slate-800">{deleteTarget.name}</span> khỏi hệ thống?
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmDelete}
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
