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
import { InvestmentMetric, NetworkGlobe, OrdersMetric, ProductsMetric, SalesMetric } from '@/components/MetricVisuals';
import SpotlightCard from '@/components/SpotlightCard';

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

  const handleInvestment = async (biz: any) => {
    const value = window.prompt('Set investment amount (৳)', String(biz.investment || 0));
    if (value === null || !Number.isFinite(Number(value)) || Number(value) < 0) return;
    const res = await fetch(`/api/businesses/${biz.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: biz.name, icon: biz.icon, color: biz.color, investment: Number(value) }) });
    if (res.ok) { const json = await res.json(); setBusinesses((prev) => prev.map((item) => item.id === biz.id ? { ...item, investment: json.business.investment } : item)); }
  };

  const handleDeleteBusiness = async (biz: any) => {
    if (!window.confirm(`Delete ${biz.name} and all of its products, orders, and access records? This cannot be undone.`)) return;
    const res = await fetch(`/api/businesses/${biz.id}`, { method: 'DELETE' });
    if (res.ok) fetchData(); else alert((await res.json()).error || 'Failed to delete business');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} businesses={businesses} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 space-y-8">
        {/* Welcome Header */}
        <div className="glass-panel relative flex min-h-[210px] flex-col justify-between gap-6 overflow-hidden rounded-3xl p-6 md:flex-row md:items-center lg:p-9">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-full md:w-1/2 bg-[radial-gradient(circle_at_center,rgba(26,83,92,0.15),transparent_65%)]" />
          <div className="pointer-events-none absolute right-0 top-0 h-full w-full max-w-[390px] opacity-90"><NetworkGlobe /></div>

          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multi-Business Workspace Command Center</span>
            </div>
            <h1 className="text-3xl font-black text-[#2B2D42] lg:text-4xl">
              Welcome, {user?.name || 'Admin'}
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
              className="glass-button relative z-10 flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-xs font-extrabold"
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
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {businesses.map((biz) => (
                <SpotlightCard
                  key={biz.id}
                  className="glass-panel group flex flex-col justify-between rounded-3xl p-5 transition-all hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(74,61,50,.14)] sm:p-6"
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
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                      <div className="relative">{user?.role === 'SUPER_ADMIN' && <button type="button" onClick={() => handleInvestment(biz)} className="absolute right-2 top-2 z-10 p-1 text-[#A6633C]" title="Edit investment"><Pencil className="h-3 w-3" /></button>}<InvestmentMetric value={biz.investment || 0} /></div>
                      <SalesMetric value={biz.todaySales || 0} />
                      <OrdersMetric value={biz.pendingOrdersCount || 0} />
                      <ProductsMetric value={biz.totalProductsCount || 0} />
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-end border-t border-white/70 pt-4">
                    <Link
                      href={`/dashboard/${biz.slug}`}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C88A58] px-4 py-3 text-xs font-black uppercase text-white shadow-lg shadow-[#C88A58]/20 sm:w-auto"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </SpotlightCard>
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
