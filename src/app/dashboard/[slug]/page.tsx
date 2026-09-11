'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import SalesAnalytics from '@/components/SalesAnalytics';
import SalesHeatmap from '@/components/SalesHeatmap';
import PendingOrders from '@/components/PendingOrders';
import ProductManagement from '@/components/ProductManagement';
import AdminManagement from '@/components/AdminManagement';
import PdfExportModal from '@/components/PdfExportModal';
import PressableButton from '@/components/motion/PressableButton';
import { springGentle } from '@/lib/motion';
import {
  TrendingUp,
  Calendar,
  ShoppingBag,
  Package,
  Shield,
  FileText,
  Building2,
  Lock,
} from 'lucide-react';

export default function BusinessDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [user, setUser] = useState<any>(null);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [currentBusiness, setCurrentBusiness] = useState<any>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'analytics' | 'heatmap' | 'orders' | 'products' | 'admins'>('analytics');
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, bRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/businesses'),
      ]);

      const uJson = await uRes.json();
      const bJson = await bRes.json();

      if (!uRes.ok || !bRes.ok) {
        router.push('/login');
        return;
      }

      setUser(uJson.user);
      setBusinesses(bJson.businesses);

      const targetBiz = bJson.businesses.find((b: any) => b.slug === slug);
      if (!targetBiz) {
        setForbidden(true);
        setLoading(false);
        return;
      }

      setCurrentBusiness(targetBiz);

      // Extract permissions for this business
      if (uJson.user.role === 'SUPER_ADMIN') {
        const fullPerms: Record<string, boolean> = {
          'sales:view': true,
          'investment:manage': true,
          'revenue:manage': true,
          'orders:view': true,
          'orders:manage': true,
          'orders:status': true,
          'pdf:export': true,
          'products:manage': true,
          'admins:manage': true,
        };
        setPermissions(fullPerms);
      } else {
        const userPerms = uJson.user.permissions
          .filter((p: any) => p.businessId === targetBiz.id)
          .reduce((acc: any, p: any) => {
            acc[p.permissionKey] = p.enabled;
            return acc;
          }, {});

        setPermissions(userPerms);

        // Auto set initial active tab based on first allowed section
        if (userPerms['sales:view']) {
          setActiveTab('analytics');
        } else if (userPerms['orders:view']) {
          setActiveTab('orders');
        } else if (userPerms['products:manage']) {
          setActiveTab('products');
        }
      }
    } catch (err) {
      console.error('Failed to load business dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-slate-400 text-sm">
        Loading business workspace...
      </div>
    );
  }

  if (forbidden || !currentBusiness) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center p-4 text-center">
        <Lock className="w-12 h-12 text-rose-500 mb-3" />
        <h1 className="text-xl font-bold text-slate-100">Access Denied to Business Workspace</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          You do not have explicit permissions to view this business workspace. Contact the Super Admin for access.
        </p>
        <PressableButton
          onClick={() => router.push('/dashboard')}
          className="mt-4 px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold"
        >
          Return to Dashboard Overview
        </PressableButton>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} businesses={businesses} currentBusinessSlug={slug} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 space-y-6">
        {/* Business Title Banner */}
        <div className="glass-panel flex flex-col justify-between gap-4 rounded-3xl p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">{currentBusiness.name}</h1>
            </div>
          </div>

          {/* PDF Export Button (Permission Gated) */}
          {permissions['pdf:export'] && (
            <PressableButton
              onClick={() => setShowPdfModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs shadow-lg shadow-purple-500/20"
            >
              <FileText className="w-4 h-4" />
              <span>Export Delivery Sheet PDF</span>
            </PressableButton>
          )}
        </div>

        {/* Tab Navigation Controls */}
        <div className="glass-panel flex items-center gap-2 overflow-x-auto rounded-2xl p-2">
          {permissions['sales:view'] && (
            <>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  activeTab === 'analytics' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {activeTab === 'analytics' && (
                  <motion.span layoutId="workspace-tab-pill" transition={springGentle} className="absolute inset-0 rounded-xl border border-emerald-500/40 bg-emerald-500/20 shadow-md" />
                )}
                <TrendingUp className="relative z-10 w-4 h-4" />
                <span className="relative z-10">Sales Analytics</span>
              </button>

              <button
                onClick={() => setActiveTab('heatmap')}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  activeTab === 'heatmap' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {activeTab === 'heatmap' && (
                  <motion.span layoutId="workspace-tab-pill" transition={springGentle} className="absolute inset-0 rounded-xl border border-emerald-500/40 bg-emerald-500/20 shadow-md" />
                )}
                <Calendar className="relative z-10 w-4 h-4" />
                <span className="relative z-10">Sales Heatmap</span>
              </button>
            </>
          )}

          {permissions['orders:view'] && (
            <button
              onClick={() => setActiveTab('orders')}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                activeTab === 'orders' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {activeTab === 'orders' && (
                <motion.span layoutId="workspace-tab-pill" transition={springGentle} className="absolute inset-0 rounded-xl border border-emerald-500/40 bg-emerald-500/20 shadow-md" />
              )}
              <ShoppingBag className="relative z-10 w-4 h-4" />
              <span className="relative z-10">Order Management</span>
            </button>
          )}

          {permissions['products:manage'] && (
            <button
              onClick={() => setActiveTab('products')}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                activeTab === 'products' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {activeTab === 'products' && (
                <motion.span layoutId="workspace-tab-pill" transition={springGentle} className="absolute inset-0 rounded-xl border border-emerald-500/40 bg-emerald-500/20 shadow-md" />
              )}
              <Package className="relative z-10 w-4 h-4" />
              <span className="relative z-10">Products Catalog</span>
            </button>
          )}

          {user?.role === 'SUPER_ADMIN' && (
            <button
              onClick={() => setActiveTab('admins')}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                activeTab === 'admins' ? 'text-purple-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {activeTab === 'admins' && (
                <motion.span layoutId="workspace-tab-pill" transition={springGentle} className="absolute inset-0 rounded-xl border border-purple-500/40 bg-purple-500/20 shadow-md" />
              )}
              <Shield className="relative z-10 w-4 h-4 text-purple-400" />
              <span className="relative z-10">Admin Permissions Panel</span>
            </button>
          )}
        </div>

        {/* Tab Contents */}
        <div className="pt-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'analytics' && permissions['sales:view'] && (
                <SalesAnalytics businessId={currentBusiness.id} investment={currentBusiness.investment} canManageInvestment={!!permissions['investment:manage']} canManageRevenue={!!permissions['revenue:manage']} onInvestmentUpdated={(investment) => setCurrentBusiness((b: any) => ({ ...b, investment }))} />
              )}

              {activeTab === 'heatmap' && permissions['sales:view'] && (
                <SalesHeatmap businessId={currentBusiness.id} />
              )}

              {activeTab === 'orders' && permissions['orders:view'] && (
                <PendingOrders
                  businessId={currentBusiness.id}
                  permissions={permissions}
                  onOrderChange={fetchData}
                />
              )}

              {activeTab === 'products' && (
                <ProductManagement businessId={currentBusiness.id} permissions={permissions} />
              )}

              {activeTab === 'admins' && user?.role === 'SUPER_ADMIN' && <AdminManagement />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* PDF Export Modal */}
      <PdfExportModal
        businessId={currentBusiness.id}
        businessName={currentBusiness.name}
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
      />
    </div>
  );
}
