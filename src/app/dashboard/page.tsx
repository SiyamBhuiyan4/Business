'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  Store,
  Plus,
  ArrowRight,
  TrendingUp,
  ShoppingBag,
  Package,
  Sparkles,
  Building2,
  X,
  Pencil,
  Trash2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function DashboardOverviewPage() {
  const [user, setUser] = useState<any>(null);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Business Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [bizName, setBizName] = useState('');
  const [bizColor, setBizColor] = useState('emerald');
  const [initialProducts, setInitialProducts] = useState([
    { name: '', unitPrice: '', sku: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, bRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/businesses'),
      ]);

      const uJson = await uRes.json();
      const bJson = await bRes.json();

      if (uRes.ok) setUser(uJson.user);
      if (bRes.ok) setBusinesses(bJson.businesses);
    } catch (err) {
      console.error('Failed to load overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddProductRow = () => {
    setInitialProducts([...initialProducts, { name: '', unitPrice: '', sku: '' }]);
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizName) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: bizName.trim(),
          color: bizColor,
          products: initialProducts.filter((p) => p.name && p.unitPrice),
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setBizName('');
        setInitialProducts([{ name: '', unitPrice: '', sku: '' }]);
        fetchData();
      } else {
        const json = await res.json();
        alert(json.error || 'Failed to create business');
      }
    } catch (err) {
      console.error('Failed to create business:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRenameBusiness = async (biz: any) => {
    const name = window.prompt('Business name', biz.name);
    if (!name?.trim() || name.trim() === biz.name) return;
    const res = await fetch(`/api/businesses/${biz.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), color: biz.color, icon: biz.icon }),
    });
    if (res.ok) fetchData(); else alert((await res.json()).error || 'Failed to edit business');
  };

  const handleDeleteBusiness = async (biz: any) => {
    if (!window.confirm(`Delete ${biz.name} and all of its products, orders, and access records? This cannot be undone.`)) return;
    const res = await fetch(`/api/businesses/${biz.id}`, { method: 'DELETE' });
    if (res.ok) fetchData(); else alert((await res.json()).error || 'Failed to delete business');
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col text-slate-100">
      <Navbar user={user} businesses={businesses} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 space-y-8">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border border-slate-800 p-6 lg:p-8 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multi-Business Workspace Command Center</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white">
              Welcome back, {user?.name || 'Admin'}!
            </h1>
            <p className="text-xs lg:text-sm text-slate-400 max-w-xl">
              {user?.role === 'SUPER_ADMIN'
                ? 'You have complete oversight over all business workspaces. Switch context below or create new business branches.'
                : 'Select an assigned business below to view sales analytics, pending orders, and delivery sheets.'}
            </p>
          </div>

          {user?.role === 'SUPER_ADMIN' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Create New Business Workspace
            </button>
          )}
        </div>

        {/* Business Cards Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-400" />
              <span>Active Business Workspaces ({businesses.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-500 text-sm">Loading workspaces...</div>
          ) : businesses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {businesses.map((biz) => (
                <div
                  key={biz.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl hover:border-slate-700 transition-all group flex flex-col justify-between"
                >
                  <div className="space-y-5">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-extrabold text-slate-100">{biz.name}</h3>
                          <span className="text-xs font-mono text-slate-400">/{biz.slug}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {user?.role === 'SUPER_ADMIN' && <>
                          <button onClick={() => handleRenameBusiness(biz)} className="p-2 text-slate-400 hover:text-white" title="Edit business"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteBusiness(biz)} className="p-2 text-rose-400 hover:text-rose-300" title="Delete business"><Trash2 className="w-4 h-4" /></button>
                        </>}
                        <Link href={`/dashboard/${biz.slug}`} className="p-2.5 rounded-xl bg-slate-800 group-hover:bg-emerald-500 group-hover:text-slate-950 text-slate-300 transition-all">
                          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                        </Link>
                      </div>
                    </div>

                    {/* Business Summary Stats */}
                    <div className="grid grid-cols-3 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-500">Today's Sales</div>
                        <div className="text-sm lg:text-base font-extrabold text-emerald-400 mt-1">
                          {formatCurrency(biz.todaySales)}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-500">Pending Orders</div>
                        <div className="text-sm lg:text-base font-extrabold text-amber-400 mt-1">
                          {biz.pendingOrdersCount} orders
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-500">Products</div>
                        <div className="text-sm lg:text-base font-extrabold text-slate-300 mt-1">
                          {biz.totalProductsCount} items
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Isolated Data & Permissions Workspace</span>
                    <Link
                      href={`/dashboard/${biz.slug}`}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl py-16 text-center text-slate-500">
              No business workspaces accessible. Contact Super Admin for access.
            </div>
          )}
        </div>
      </main>

      {/* Create New Business Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
              <h3 className="text-base font-bold text-slate-100">Create New Business Workspace</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBusiness} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Business Name *</label>
                <input
                  type="text"
                  required
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  placeholder="e.g. Organic Honey Agribusiness"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Initial Products */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-300">Initial Catalog Products</label>
                  <button
                    type="button"
                    onClick={handleAddProductRow}
                    className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Product Line
                  </button>
                </div>

                {initialProducts.map((prod, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Product Name"
                      value={prod.name}
                      onChange={(e) => {
                        const updated = [...initialProducts];
                        updated[idx].name = e.target.value;
                        setInitialProducts(updated);
                      }}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                    />
                    <input
                      type="number"
                      placeholder="Price (BDT ৳)"
                      value={prod.unitPrice}
                      onChange={(e) => {
                        const updated = [...initialProducts];
                        updated[idx].unitPrice = e.target.value;
                        setInitialProducts(updated);
                      }}
                      className="w-28 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
                >
                  {submitting ? 'Creating...' : 'Create Business'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
