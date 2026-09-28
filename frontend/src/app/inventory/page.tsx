'use client';

import React, { useEffect, useState } from 'react';
import { Package, AlertTriangle, Plus, ArrowUpRight, ArrowDownLeft, Edit, Trash2, X, FolderPlus, Layers } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { fetchApi } from '@/lib/api';
import { InventoryItem, InventoryCategory } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals visibility
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);

  const [showTxModal, setShowTxModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Form states for item
  const [itemForm, setItemForm] = useState({
    code: '',
    name: '',
    category_id: 1,
    unit: 'Kg',
    min_quantity: 10,
    current_quantity: 100,
    expiry_date: '',
    cost_per_unit: 50000,
    notes: '',
  });

  // Transaction form states
  const [txType, setTxType] = useState<'IMPORT' | 'EXPORT'>('IMPORT');
  const [txQty, setTxQty] = useState<number>(10);
  const [txNotes, setTxNotes] = useState('');

  const { hasRole } = useAuth();

  useEffect(() => {
    loadInventory();
  }, []);

  async function loadInventory() {
    try {
      const [itemsData, catsData] = await Promise.all([
        fetchApi<any>('/inventory/items'),
        fetchApi<any>('/inventory/categories'),
      ]);
      const itemsList = Array.isArray(itemsData) ? itemsData : (itemsData?.data || itemsData?.items || []);
      const catsList = Array.isArray(catsData) ? catsData : (catsData?.data || catsData?.items || []);
      setItems(itemsList);
      setCategories(catsList);
      if (catsList.length > 0 && !itemForm.category_id) {
        setItemForm(prev => ({ ...prev, category_id: catsList[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Generate fixed VT auto-increment code
  const generateItemCode = (itemsList: InventoryItem[] = items): string => {
    const nextNum = itemsList.length + 1;
    const numStr = nextNum < 10 ? `00${nextNum}` : nextNum < 100 ? `0${nextNum}` : `${nextNum}`;
    return `VT-${numStr}`;
  };

  // Open Create Item Modal
  const openCreateItemModal = () => {
    setEditingItem(null);
    const initialCatId = categories.length > 0 ? categories[0].id : 1;
    const autoCode = generateItemCode();
    setItemForm({
      code: autoCode,
      name: '',
      category_id: initialCatId,
      unit: 'Kg',
      min_quantity: 10,
      current_quantity: 100,
      expiry_date: '',
      cost_per_unit: 50000,
      notes: '',
    });
    setShowItemModal(true);
  };

  // Handle Category Select Change
  const handleCategoryChange = (catId: number) => {
    setItemForm(prev => ({
      ...prev,
      category_id: catId,
    }));
  };

  // Open Edit Item Modal
  const openEditItemModal = (item: InventoryItem) => {
    setEditingItem(item);
    setItemForm({
      code: item.code,
      name: item.name,
      category_id: item.category_id,
      unit: item.unit,
      min_quantity: item.min_quantity,
      current_quantity: item.current_quantity,
      expiry_date: item.expiry_date || '',
      cost_per_unit: item.cost_per_unit,
      notes: item.notes || '',
    });
    setShowItemModal(true);
  };

  // Save Item (Create or Update)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...itemForm,
        expiry_date: itemForm.expiry_date && itemForm.expiry_date.trim() !== '' ? itemForm.expiry_date : null,
      };

      if (editingItem) {
        await fetchApi(`/inventory/items/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/inventory/items', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setShowItemModal(false);
      loadInventory();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu vật tư');
    }
  };

  // Confirm Delete Item
  const handleDeleteItem = async () => {
    if (!deletingItem) return;
    try {
      await fetchApi(`/inventory/items/${deletingItem.id}`, {
        method: 'DELETE',
      });
      setShowDeleteModal(false);
      setDeletingItem(null);
      loadInventory();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa vật tư');
    }
  };

  // Category Save
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await fetchApi(`/inventory/categories/${editingCategory.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: categoryName, description: categoryDesc }),
        });
      } else {
        await fetchApi('/inventory/categories', {
          method: 'POST',
          body: JSON.stringify({ name: categoryName, description: categoryDesc }),
        });
      }
      setCategoryName('');
      setCategoryDesc('');
      setEditingCategory(null);
      loadInventory();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu danh mục');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await fetchApi(`/inventory/categories/${id}`, { method: 'DELETE' });
      loadInventory();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa danh mục');
    }
  };

  // Transaction Save
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
          notes: txNotes,
        }),
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
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCategoryModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                <Layers className="w-4 h-4" />
                <span>Danh Mục Kho</span>
              </button>
              {hasRole(['ADMIN', 'FARM_MANAGER']) && (
                <button
                  onClick={openCreateItemModal}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Vật Tư Mới</span>
                </button>
              )}
            </div>
          }
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
                    <th className="p-4">Tên Vật Tư</th>
                    <th className="p-4">Danh Mục</th>
                    <th className="p-4">Tồn Kho Hiện Tại</th>
                    <th className="p-4">Ngưỡng Tối Thiểu</th>
                    <th className="p-4">Hạn Sử Dụng</th>
                    <th className="p-4">Đơn Giá (VNĐ)</th>
                    <th className="p-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const isLow = item.current_quantity <= item.min_quantity;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 font-bold text-slate-900 text-sm">
                          {item.name}
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
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => { setSelectedItem(item); setShowTxModal(true); }}
                              className="px-2.5 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-600 font-semibold text-xs transition-colors"
                            >
                              Nhập/Xuất
                            </button>
                            {hasRole(['ADMIN', 'FARM_MANAGER']) && (
                              <>
                                <button
                                  onClick={() => openEditItemModal(item)}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                                  title="Sửa vật tư"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => { setDeletingItem(item); setShowDeleteModal(true); }}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                                  title="Xóa vật tư"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CREATE / EDIT ITEM MODAL */}
        {showItemModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b">
                <h3 className="font-bold text-slate-900 text-lg">
                  {editingItem ? 'Chỉnh Sửa Vật Tư' : 'Thêm Vật Tư Mới'}
                </h3>
                <button onClick={() => setShowItemModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <form onSubmit={handleSaveItem} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên vật tư *</label>
                  <input
                    type="text"
                    required
                    placeholder="Cám hỗn hợp Vina..."
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Danh mục *</label>
                    <select
                      value={itemForm.category_id}
                      onChange={(e) => handleCategoryChange(parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border bg-white font-medium"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Đơn vị tính *</label>
                    <input
                      type="text"
                      required
                      placeholder="Kg, Chai, Liều..."
                      value={itemForm.unit}
                      onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tồn kho hiện tại</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={itemForm.current_quantity}
                      onChange={(e) => setItemForm({ ...itemForm, current_quantity: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tồn kho tối thiểu</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={itemForm.min_quantity}
                      onChange={(e) => setItemForm({ ...itemForm, min_quantity: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Đơn giá (VNĐ)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={itemForm.cost_per_unit}
                      onChange={(e) => setItemForm({ ...itemForm, cost_per_unit: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Hạn sử dụng</label>
                    <input
                      type="date"
                      value={itemForm.expiry_date}
                      onChange={(e) => setItemForm({ ...itemForm, expiry_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ghi chú</label>
                    <input
                      type="text"
                      value={itemForm.notes}
                      onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border"
                      placeholder="Mô tả hoặc bảo quản..."
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowItemModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-brand-500 text-white font-bold"
                  >
                    {editingItem ? 'Lưu Thay Đổi' : 'Thêm Vật Tư'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE ITEM CONFIRMATION MODAL */}
        {showDeleteModal && deletingItem && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Xác Nhận Xóa Vật Tư</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Bạn có chắc chắn muốn xóa vật tư <span className="font-bold text-slate-800">{deletingItem.name}</span> khỏi hệ thống?
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDeleteItem}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                >
                  Xác Nhận Xóa
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORY MANAGEMENT MODAL */}
        {showCategoryModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b">
                <h3 className="font-bold text-slate-900 text-lg">Quản Lý Danh Mục Kho</h3>
                <button onClick={() => { setShowCategoryModal(false); setEditingCategory(null); }}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              {/* Add / Edit Category Form */}
              <form onSubmit={handleSaveCategory} className="p-3 bg-slate-50 rounded-2xl border space-y-2 text-xs">
                <p className="font-bold text-slate-800">
                  {editingCategory ? `Sửa Danh Mục #${editingCategory.id}` : 'Thêm Danh Mục Mới'}
                </p>
                <input
                  type="text"
                  required
                  placeholder="Tên danh mục (ví dụ: Thức ăn, Vắc xin...)"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border bg-white"
                />
                <input
                  type="text"
                  placeholder="Mô tả danh mục..."
                  value={categoryDesc}
                  onChange={(e) => setCategoryDesc(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border bg-white"
                />
                <div className="flex justify-end gap-2 pt-1">
                  {editingCategory && (
                    <button
                      type="button"
                      onClick={() => { setEditingCategory(null); setCategoryName(''); setCategoryDesc(''); }}
                      className="px-3 py-1 rounded-lg bg-slate-200 text-slate-700 font-semibold"
                    >
                      Hủy
                    </button>
                  )}
                  <button type="submit" className="px-4 py-1 rounded-lg bg-brand-500 text-white font-bold">
                    {editingCategory ? 'Lưu' : '+ Thêm'}
                  </button>
                </div>
              </form>

              {/* Category List */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Danh Sách Danh Mục Hiện Có</p>
                {categories.map((cat) => (
                  <div key={cat.id} className="p-3 rounded-xl border bg-white flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{cat.name}</p>
                      <p className="text-[11px] text-slate-500">{cat.description || 'Không có mô tả'}</p>
                    </div>
                    {hasRole(['ADMIN', 'FARM_MANAGER']) && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingCategory(cat);
                            setCategoryName(cat.name);
                            setCategoryDesc(cat.description || '');
                          }}
                          className="p-1 text-slate-500 hover:text-brand-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
