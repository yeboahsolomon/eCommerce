'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { Coupon, Pagination } from '@/types';
import {
  Tag, Plus, Search, Edit2, Trash2, Check, X,
  Percent, DollarSign, Calendar, Copy, ChevronLeft, ChevronRight,
} from 'lucide-react';

interface CouponForm {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderInPesewas: number;
  maxDiscountInPesewas: number | '';
  usageLimit: number | '';
  expiresAt: string;
  isActive: boolean;
}

const DEFAULT_FORM: CouponForm = {
  code: '',
  discountType: 'percentage',
  discountValue: 10,
  minOrderInPesewas: 0,
  maxDiscountInPesewas: '',
  usageLimit: '',
  expiresAt: '',
  isActive: true,
};

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isExpired(coupon: Coupon) {
  if (!coupon.expiresAt) return false;
  return new Date(coupon.expiresAt) < new Date();
}

export default function AdminCouponsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponForm>(DEFAULT_FORM);

  // Fetch coupons
  const { data, isLoading } = useQuery({
    queryKey: ['admin-coupons', page, search, filter],
    queryFn: () => api.getAdminCoupons({ page, limit: 15, search: search || undefined, status: filter !== 'all' ? filter : undefined }),
  });

  const coupons = data?.data?.coupons || [];
  const pagination = data?.data?.pagination;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createCoupon(data),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Coupon created!');
        queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
        closeModal();
      } else {
        toast.error(res.message || 'Failed to create coupon');
      }
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Coupon> }) => api.updateCoupon(id, data),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Coupon updated!');
        queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
        closeModal();
      } else {
        toast.error(res.message || 'Failed to update coupon');
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCoupon(id),
    onSuccess: () => {
      toast.success('Coupon deactivated');
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
  });

  const openCreateModal = () => {
    setForm(DEFAULT_FORM);
    setEditingId(null);
    setShowModal(true);
  };

  const openEditModal = (coupon: Coupon) => {
    setForm({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderInPesewas: coupon.minOrderInPesewas || 0,
      maxDiscountInPesewas: coupon.maxDiscountInPesewas || '',
      usageLimit: coupon.usageLimit || '',
      expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().slice(0, 16) : '',
      isActive: coupon.isActive,
    });
    setEditingId(coupon.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(DEFAULT_FORM);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      code: form.code,
      discountType: form.discountType,
      discountValue: form.discountValue,
      minOrderInPesewas: form.minOrderInPesewas,
      isActive: form.isActive,
    };
    if (form.maxDiscountInPesewas !== '') payload.maxDiscountInPesewas = Number(form.maxDiscountInPesewas);
    if (form.usageLimit !== '') payload.usageLimit = Number(form.usageLimit);
    if (form.expiresAt) payload.expiresAt = new Date(form.expiresAt).toISOString();

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="h-6 w-6 text-blue-600" />
            Coupon Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage discount codes</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors w-fit"
        >
          <Plus className="h-4 w-4" />
          Create Coupon
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by code..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-white border border-gray-200 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'expired'].map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading coupons...</div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Tag className="h-10 w-10 text-gray-300 mx-auto" />
            <p className="text-gray-500 font-medium">No coupons found</p>
            <p className="text-gray-400 text-sm">Create your first coupon to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Code</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Discount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden md:table-cell">Min Order</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden md:table-cell">Usage</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden lg:table-cell">Expires</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coupons.map((coupon: Coupon) => {
                  const expired = isExpired(coupon);
                  return (
                    <tr key={coupon.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => { navigator.clipboard.writeText(coupon.code); toast.success('Code copied!'); }}
                          className="flex items-center gap-1.5 font-mono font-bold text-blue-700 hover:text-blue-900 bg-blue-50 px-2 py-1 rounded"
                        >
                          {coupon.code} <Copy className="h-3 w-3 text-blue-400" />
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          {coupon.discountType === 'percentage' ? (
                            <>
                              <Percent className="h-3.5 w-3.5 text-green-500" />
                              <span className="font-semibold">{coupon.discountValue}%</span>
                            </>
                          ) : (
                            <>
                              <DollarSign className="h-3.5 w-3.5 text-green-500" />
                              <span className="font-semibold">GH₵{(coupon.discountValue / 100).toFixed(2)}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-500 hidden md:table-cell">
                        {coupon.minOrderInPesewas ? `GH₵${(coupon.minOrderInPesewas / 100).toFixed(0)}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-gray-500 hidden md:table-cell">
                        {coupon.usageCount}/{coupon.usageLimit || '∞'}
                      </td>
                      <td className="py-3 px-4 text-gray-500 hidden lg:table-cell">
                        {coupon.expiresAt ? formatDate(coupon.expiresAt) : 'Never'}
                      </td>
                      <td className="py-3 px-4">
                        {expired ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-50 text-red-600 px-2 py-1 rounded-full">
                            <X className="h-3 w-3" /> Expired
                          </span>
                        ) : coupon.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-50 text-green-600 px-2 py-1 rounded-full">
                            <Check className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(coupon)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {coupon.isActive && (
                            <button
                              onClick={() => { if (confirm('Deactivate this coupon?')) deleteMutation.mutate(coupon.id); }}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                              title="Deactivate"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-sm text-gray-500">{pagination.total} total coupons</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-600 px-2">
                Page {page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit Coupon' : 'Create New Coupon'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="SAVE20"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Discount Type + Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm({ ...form, discountType: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₵)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                  <input
                    type="number"
                    value={form.discountValue}
                    onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                    min={1}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">
                    {form.discountType === 'percentage' ? 'e.g. 10 = 10% off' : 'In pesewas (1000 = GH₵10)'}
                  </p>
                </div>
              </div>

              {/* Min order + Max discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Order (₵)</label>
                  <input
                    type="number"
                    value={form.minOrderInPesewas / 100}
                    onChange={(e) => setForm({ ...form, minOrderInPesewas: Number(e.target.value) * 100 })}
                    min={0}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit</label>
                  <input
                    type="number"
                    value={form.usageLimit}
                    onChange={(e) => setForm({ ...form, usageLimit: e.target.value ? Number(e.target.value) : '' })}
                    min={1}
                    placeholder="Unlimited"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Expiry */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
                <input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-0.5">Leave empty for no expiry</p>
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingId ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
