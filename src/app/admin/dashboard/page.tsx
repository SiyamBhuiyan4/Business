'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Store, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function AdminDashboardPage() {
  const router = useRouter(); const [user, setUser] = useState<any>(null); const [businesses, setBusinesses] = useState<any[]>([]);
  useEffect(() => { Promise.all([fetch('/api/auth/me'), fetch('/api/businesses')]).then(async ([u, b]) => { const userData = await u.json(); const businessData = await b.json(); if (!u.ok || userData.user.role !== 'ADMIN') return router.replace('/login'); setUser(userData.user); setBusinesses(businessData.businesses || []); }); }, [router]);
  return <main className="min-h-screen bg-[#0b0f19] p-4 text-slate-100 lg:p-10"><div className="mx-auto max-w-5xl space-y-8"><header><p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Assigned workspaces</p><h1 className="mt-2 text-3xl font-black">Welcome, {user?.name || 'Admin'}</h1><p className="mt-2 text-sm text-slate-400">Only your assigned businesses are shown here.</p></header><section className="grid gap-5 md:grid-cols-2">{businesses.map((business) => <Link key={business.id} href={`/admin/dashboard/${business.slug}`} className="rounded-3xl border border-slate-800 bg-slate-900 p-6 transition hover:border-emerald-500/50"><Store className="mb-4 text-emerald-400" /><h2 className="text-xl font-bold">{business.name}</h2><div className="mt-5 flex justify-between text-xs"><span className="text-slate-400">Today’s sales <b className="ml-1 text-emerald-400">{formatCurrency(business.todaySales)}</b></span><span className="text-slate-400">{business.pendingOrdersCount} pending</span></div><span className="mt-6 flex items-center gap-1 text-xs font-bold text-emerald-400">Open workspace <ArrowRight className="h-4 w-4" /></span></Link>)}</section>{businesses.length === 0 && <p className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-sm text-slate-400">No business workspaces have been assigned to your account.</p>}</div></main>;
}
