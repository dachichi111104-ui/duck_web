'use client';

import React, { useEffect, useState } from 'react';
import { Package, AlertTriangle, Plus, ArrowUpRight, ArrowDownLeft, RefreshCw, X } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { fetchApi } from '@/lib/api';
import { InventoryItem } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTxModal, setShowTxModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const [txType, setTxType] = useState<'IMPORT' | 'EXPORT'>('IMPORT');
  const [txQty, setTxQty] = useState<number>(10);
  const [txNotes, setTxNotes] = useState('');

  const { hasRole } = useAuth();

  useEffect(() => {
    loadInventory();
  }, []);

  async function loadInventory() {
    try {
      const data = await fetchApi<InventoryItem[]>('/inventory/items');
      setItems(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      await fetchApi('/inventory/transactions', {
        method: 'POST',
        body: JSON.stringify({
          item_id: selectedItem.id,
          transaction_type: txType,
          quantity: txQty,
          notes: txNotes
        })
      });
      setShowTxModal(false);
      loadInventory();
    } catch (err: any) {
      alert(err.message || 'Lỗi giao dịch kho');
    }
  };

  const lowStockItems = items.filter(i => i.current_quantity <= i.min_quantity);

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <PageHeader
          icon={Package}
          title="Quản Lý Kho Vật Tư"
          description="Theo dõi tồn kho thức ăn, vắc xin, thuốc thú y &amp; thiết bị chăn nuôi"
        />

        {lowStockItems.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold">Cảnh báo tồn kho xuống dưới mức tối thiểu ({lowStockItems.length} vật tư)</p>
              <p className="text-amber-800">
                Các vật tư: {lowStockItems.map(i => `${i.name} (Tồn: ${i.current_quantity} ${i.unit})`).join(', ')}. Cần lập kế hoạch bổ sung.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500">Đang tải danh sách vật tư kho...</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Chưa có vật tư trong kho"
            description="Thêm vật tư mới để bắt đầu theo dõi tồn kho và nhập xuất"
          />
        ) : (
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Mã / Tên Vật Tư</th>
                    <th className="p-4">Danh Mục</th>
                    <th className="p-4">Tồn Kho Hiện Tại</th>
                    <th className="p-4">Ngưỡng Tối Thiểu</th>
                    <th className="p-4">Hạn Sử Dụng</th>
                    <th className="p-4">Đơn Giá (VNĐ)</th>
                    <th className="p-4 text-right">Thao Tác Kho</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const isLow = item.current_quantity <= item.min_quantity;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                          <span className="font-mono text-[11px] text-slate-400">{item.code}</span>
                        </td>
                        <td className="p-4">{item.category?.name || 'Vật tư'}</td>
                        <td className="p-4">
                          <span className={`font-bold text-sm ${isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                            {item.current_quantity.toLocaleString()} {item.unit}
                          </span>
                        </td>
                        <td className="p-4 font-medium text-slate-500">{item.min_quantity} {item.unit}</td>
                        <td className="p-4 font-mono text-slate-600">{item.expiry_date || 'N/A'}</td>
                        <td className="p-4 font-semibold text-slate-800">{item.cost_per_unit.toLocaleString()} đ</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => { setSelectedItem(item); setShowTxModal(true); }}
                            className="px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-600 font-semibold text-xs transition-colors"
                          >
                            Nhập / Xuất kho
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TRANSACTION MODAL */}
        {showTxModal && selectedItem && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <h3 className="font-bold text-slate-900 text-lg">Giao Dịch Kho: {selectedItem.name}</h3>
                <button onClick={() => setShowTxModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <form onSubmit={handleTransaction} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loại giao dịch</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTxType('IMPORT')}
                      className={`py-2 rounded-xl font-bold ${txType === 'IMPORT' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700'}`}
                    >
                      + Nhập Kho
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType('EXPORT')}
                      className={`py-2 rounded-xl font-bold ${txType === 'EXPORT' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700'}`}
                    >
                      - Xuất Kho
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số lượng ({selectedItem.unit})</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={txQty}
                    onChange={(e) => setTxQty(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ghi chú giao dịch</label>
                  <input
                    type="text"
                    placeholder="Nhập lý do xuất/nhập..."
                    value={txNotes}
                    onChange={(e) => setTxNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTxModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-brand-500 text-white font-bold"
                  >
                    Xác Nhận Giao Dịch
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
