'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Store, ArrowRight, Building2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { InvestmentMetric, OrdersMetric, ProductsMetric, SalesMetric } from '@/components/MetricVisuals';
import { staggerContainer, staggerItem } from '@/lib/motion';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [businesses, setBusinesses] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([fetch('/api/auth/me'), fetch('/api/businesses')]).then(async ([u, b]) => {
      const userData = await u.json();
      const businessData = await b.json();
      if (!u.ok || userData.user.role !== 'ADMIN') return router.replace('/admin/login');
      setUser(userData.user);
      setBusinesses(businessData.businesses || []);
    });
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} businesses={businesses} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 space-y-8">
        <header>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Assigned workspaces</p>
          <h1 className="mt-2 text-3xl font-black" style={{ color: 'var(--ink)' }}>
            Welcome, {user?.name || 'Admin'}
          </h1>
          <p className="mt-2 text-sm text-slate-400">Only your assigned businesses are shown here.</p>
        </header>

        {businesses.length > 0 ? (
          <motion.section
            className="grid gap-6 lg:grid-cols-2"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {businesses.map((business) => (
              <motion.div
                key={business.id}
                variants={staggerItem}
                whileHover={{ y: -6 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className="glass-panel group flex flex-col justify-between rounded-3xl p-5 hover:shadow-[0_22px_55px_rgba(74,61,50,.14)] sm:p-6"
              >
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-100">{business.name}</h2>
                      <span className="text-xs font-mono text-slate-400">/{business.slug}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                    <InvestmentMetric value={business.investment || 0} />
                    <SalesMetric value={business.todaySales || 0} />
                    <OrdersMetric value={business.pendingOrdersCount || 0} />
                    <ProductsMetric value={business.totalProductsCount || 0} />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end border-t pt-4" style={{ borderColor: 'var(--glass-border)' }}>
                  <Link
                    href={`/admin/dashboard/${business.slug}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase text-white shadow-lg sm:w-auto"
                    style={{ background: 'var(--copper)', boxShadow: '0 10px 25px -5px rgba(200,138,88,.3)' }}
                  >
                    <span>Open Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.section>
        ) : (
          <div className="glass-panel rounded-3xl py-16 text-center text-sm text-slate-400">
            <Store className="mx-auto mb-3 h-8 w-8 text-slate-500" />
            No business workspaces have been assigned to your account.
          </div>
        )}
      </main>
    </div>
  );
}
