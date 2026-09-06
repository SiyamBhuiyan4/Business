'use client';

import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, CheckCircle, XCircle, Tag } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { confirmMutation } from '@/lib/confirmMutation';
import SpotlightCard from '@/components/SpotlightCard';

interface ProductManagementProps {
  businessId: string;
  permissions: Record<string, boolean>;
}

export default function ProductManagement({ businessId, permissions }: ProductManagementProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [sku, setSku] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/products`);
      const json = await res.json();
      if (res.ok) {
        setProducts(json.products);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [businessId]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !unitPrice) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          unitPrice: parseFloat(unitPrice),
          sku: sku.trim() || undefined,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setName('');
        setUnitPrice('');
        setSku('');
        fetchProducts();
      } else {
        const json = await res.json();
        alert(json.error || 'Failed to create product');
      }
    } catch (err) {
      console.error('Error adding product:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAvailability = async (productId: string, currentStatus: boolean) => {
    const approval = await confirmMutation(`You are about to change product availability.`); if (!approval) return;
    try {
      const res = await fetch(`/api/businesses/${businessId}/products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, isAvailable: !currentStatus, ...approval }),
      });
      if (res.ok) {
        fetchProducts();
      }
    } catch (err) {
      console.error('Failed to toggle availability:', err);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const approval = await confirmMutation(`You are about to delete this product. This cannot be undone.`); if (!approval) return;
    try {
      const res = await fetch(`/api/businesses/${businessId}/products?productId=${productId}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(approval),
      });
      if (res.ok) {
        fetchProducts();
      }
    } catch (err) {
      console.error('Failed to delete product:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="analytics-glass p-5 rounded-2xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#0D9488]" />
            <h2 className="text-lg font-bold text-[#0F172A]">Product Catalog & Inventory</h2>
          </div>
          <p className="text-xs text-[#64748B] mt-1">Manage products, pricing, and availability</p>
        </div>

        {permissions['products:manage'] && (
          <button
            onClick={() => setShowAddModal(true)}
            className="order-primary flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Add Product
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-500 text-sm">Loading catalog...</div>
        ) : products.length > 0 ? (
          products.map((prod) => (
            <SpotlightCard
              key={prod.id}
              className="product-card relative flex flex-col justify-between overflow-hidden rounded-2xl p-5"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="product-sku">
                    {prod.sku || 'SKU-NONE'}
                  </span>
                  <button
                    onClick={() => permissions['products:manage'] && handleToggleAvailability(prod.id, prod.isAvailable)}
                    disabled={!permissions['products:manage']}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      prod.isAvailable ? 'product-stock-in' : 'product-stock-out'
                    }`}
                  >
                    {prod.isAvailable ? 'In Stock' : 'Out of Stock'}
                  </button>
                </div>

                <div className="product-image"><Package className="h-8 w-8" /></div>
                <h3 className="product-title mt-3 break-words">{prod.name}</h3>

                <div className="product-price mt-2">
                  {formatCurrency(prod.unitPrice)}
                </div>
              </div>

              {permissions['products:manage'] && (
                <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
                  <button
                    onClick={() => handleDeleteProduct(prod.id)}
                    className="order-action order-action-delete"
                    title="Delete product"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </SpotlightCard>
          ))
        ) : (
          <div className="col-span-full py-16 text-center text-slate-500 text-sm">
            No products found in this business catalog
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
              <h3 className="text-base font-bold text-slate-100">Add Product to Catalog</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Fresh Oyster Mushroom"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Unit Price (BDT ৳) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="250.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">SKU / Code (Optional)</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="MUSH-OYSTER-01"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
                >
                  {submitting ? 'Saving...' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
