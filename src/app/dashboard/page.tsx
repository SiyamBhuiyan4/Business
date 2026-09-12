'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
import Modal from '@/components/motion/Modal';
import PressableButton from '@/components/motion/PressableButton';
import { useToast } from '@/components/motion/Toast';
import { staggerContainer, staggerItem } from '@/lib/motion';

export default function DashboardOverviewPage() {
  const toast = useToast();
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
        toast.success('Business workspace created');
      } else {
        const json = await res.json();
        toast.error(json.error || 'Failed to create business');
      }
    } catch (err) {
      console.error('Failed to create business:', err);
      toast.error('Failed to create business');
    } finally {
      setSubmitting(false);
    }
  };

  // Rename Business Modal
  const [renameTarget, setRenameTarget] = useState<any>(null);
  const [renameValue, setRenameValue] = useState('');
  const openRenameModal = (biz: any) => { setRenameTarget(biz); setRenameValue(biz.name); };
  const submitRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameValue.trim() || renameValue.trim() === renameTarget.name) return setRenameTarget(null);
    const res = await fetch(`/api/businesses/${renameTarget.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: renameValue.trim(), color: renameTarget.color, icon: renameTarget.icon }),
    });
    if (res.ok) { fetchData(); toast.success('Business renamed'); } else toast.error((await res.json()).error || 'Failed to edit business');
    setRenameTarget(null);
  };

  // Investment Modal
  const [investmentTarget, setInvestmentTarget] = useState<any>(null);
  const [investmentValue, setInvestmentValue] = useState('');
  const openInvestmentModal = (biz: any) => { setInvestmentTarget(biz); setInvestmentValue(String(biz.investment || 0)); };
  const submitInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(investmentValue);
    if (!Number.isFinite(num) || num < 0) { toast.error('Enter a valid non-negative amount'); return; }
    const res = await fetch(`/api/businesses/${investmentTarget.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: investmentTarget.name, icon: investmentTarget.icon, color: investmentTarget.color, investment: num }),
    });
    if (res.ok) {
      const json = await res.json();
      setBusinesses((prev) => prev.map((item) => (item.id === investmentTarget.id ? { ...item, investment: json.business.investment } : item)));
      toast.success('Investment updated');
    } else toast.error((await res.json()).error || 'Failed to update investment');
    setInvestmentTarget(null);
  };

  // Delete Business Modal
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const submitDelete = async () => {
    const res = await fetch(`/api/businesses/${deleteTarget.id}`, { method: 'DELETE' });
    if (res.ok) { fetchData(); toast.success('Business deleted'); } else toast.error((await res.json()).error || 'Failed to delete business');
    setDeleteTarget(null);
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
            <h1 className="text-3xl font-black lg:text-4xl" style={{ color: 'var(--ink)' }}>
              Welcome, {user?.name || 'Admin'}
            </h1>
            <p className="text-xs lg:text-sm text-slate-400 max-w-xl">
              {user?.role === 'SUPER_ADMIN'
                ? 'You have complete oversight over all business workspaces. Switch context below or create new business branches.'
                : 'Select an assigned business below to view sales analytics, pending orders, and delivery sheets.'}
            </p>
          </div>

          {user?.role === 'SUPER_ADMIN' && (
            <PressableButton
              onClick={() => setShowCreateModal(true)}
              className="glass-button relative z-10 flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-xs font-extrabold"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Create New Business Workspace
            </PressableButton>
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
            <motion.div
              className="grid grid-cols-1 gap-6 lg:grid-cols-2"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {businesses.map((biz) => (
                <motion.div
                  key={biz.id}
                  variants={staggerItem}
                  whileHover={{ y: -6 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  className="glass-panel group flex flex-col justify-between rounded-3xl p-5 hover:shadow-[0_22px_55px_rgba(74,61,50,.14)] sm:p-6"
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
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {user?.role === 'SUPER_ADMIN' && <>
                          <button onClick={() => openRenameModal(biz)} className="p-2 text-slate-400 hover:text-white" title="Edit business"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => setDeleteTarget(biz)} className="p-2 text-rose-400 hover:text-rose-300" title="Delete business"><Trash2 className="w-4 h-4" /></button>
                        </>}
                        <Link href={`/dashboard/${biz.slug}`} className="p-2.5 rounded-xl bg-slate-800 group-hover:bg-emerald-500 group-hover:text-slate-950 text-slate-300 transition-all">
                          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                        </Link>
                      </div>
                    </div>

                    {/* Business Summary Stats */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                      <div className="relative">{user?.role === 'SUPER_ADMIN' && <button type="button" onClick={() => openInvestmentModal(biz)} className="absolute right-2 top-2 z-10 p-1 text-[#A6633C]" title="Edit investment"><Pencil className="h-3 w-3" /></button>}<InvestmentMetric value={biz.investment || 0} /></div>
                      <SalesMetric value={biz.todaySales || 0} />
                      <OrdersMetric value={biz.pendingOrdersCount || 0} />
                      <ProductsMetric value={biz.totalProductsCount || 0} />
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-end border-t pt-4" style={{ borderColor: 'var(--glass-border)' }}>
                    <Link
                      href={`/dashboard/${biz.slug}`}
                      className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase text-white shadow-lg sm:w-auto"
                      style={{ background: 'var(--copper)', boxShadow: '0 10px 25px -5px rgba(200,138,88,.3)' }}
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="glass-panel rounded-3xl py-16 text-center text-slate-500">
              No business workspaces accessible. Contact Super Admin for access.
            </div>
          )}
        </div>
      </main>

      {/* Create New Business Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} className="max-h-[90vh]">
        <div className="glass-panel rounded-2xl w-full overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--glass-border)' }}>
              <h3 className="text-base font-bold" style={{ color: 'var(--ink)' }}>Create New Business Workspace</h3>
              <PressableButton
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                style={{ background: 'rgba(0,0,0,.06)' }}
              >
                <X className="w-5 h-5" />
              </PressableButton>
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
                  className="w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#1A535C]"
                />
              </div>

              {/* Initial Products */}
              <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--glass-border)' }}>
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
                      className="flex-1 rounded-xl px-3 py-2 text-xs"
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
                      className="w-28 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t" style={{ borderColor: 'var(--glass-border)' }}>
                <PressableButton
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold"
                  style={{ background: 'rgba(0,0,0,.06)', color: 'var(--ink)' }}
                >
                  Cancel
                </PressableButton>
                <PressableButton
                  type="submit"
                  disabled={submitting}
                  className="glass-button px-5 py-2 rounded-xl font-bold text-xs disabled:opacity-60"
                >
                  {submitting ? 'Creating...' : 'Create Business'}
                </PressableButton>
              </div>
            </form>
        </div>
      </Modal>

      {/* Rename Business Modal */}
      <Modal open={!!renameTarget} onClose={() => setRenameTarget(null)}>
        <div className="glass-panel rounded-2xl w-full p-6 space-y-4">
          <h3 className="text-base font-bold" style={{ color: 'var(--ink)' }}>Rename Business</h3>
          <form onSubmit={submitRename} className="space-y-4">
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm"
            />
            <div className="flex justify-end gap-3">
              <PressableButton type="button" onClick={() => setRenameTarget(null)} className="px-4 py-2 rounded-xl text-xs font-semibold" style={{ background: 'rgba(0,0,0,.06)', color: 'var(--ink)' }}>
                Cancel
              </PressableButton>
              <PressableButton type="submit" className="glass-button px-5 py-2 rounded-xl text-xs font-bold">
                Save
              </PressableButton>
            </div>
          </form>
        </div>
      </Modal>

      {/* Investment Modal */}
      <Modal open={!!investmentTarget} onClose={() => setInvestmentTarget(null)}>
        <div className="glass-panel rounded-2xl w-full p-6 space-y-4">
          <h3 className="text-base font-bold" style={{ color: 'var(--ink)' }}>Set Investment Amount</h3>
          <form onSubmit={submitInvestment} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Amount (৳)</label>
              <input
                autoFocus
                type="number"
                min="0"
                step="0.01"
                value={investmentValue}
                onChange={(e) => setInvestmentValue(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm"
              />
            </div>
            <div className="flex justify-end gap-3">
              <PressableButton type="button" onClick={() => setInvestmentTarget(null)} className="px-4 py-2 rounded-xl text-xs font-semibold" style={{ background: 'rgba(0,0,0,.06)', color: 'var(--ink)' }}>
                Cancel
              </PressableButton>
              <PressableButton type="submit" className="glass-button px-5 py-2 rounded-xl text-xs font-bold">
                Save
              </PressableButton>
            </div>
          </form>
        </div>
      </Modal>

      {/* Delete Business Modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="max-w-sm">
        <div className="glass-panel rounded-2xl w-full p-6 space-y-4 text-center">
          <Trash2 className="mx-auto h-8 w-8 text-rose-500" />
          <h3 className="text-base font-bold" style={{ color: 'var(--ink)' }}>Delete {deleteTarget?.name}?</h3>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            This deletes all of its products, orders, and access records. This cannot be undone.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <PressableButton onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-xl text-xs font-semibold" style={{ background: 'rgba(0,0,0,.06)', color: 'var(--ink)' }}>
              Cancel
            </PressableButton>
            <PressableButton onClick={submitDelete} className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500">
              Delete
            </PressableButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
