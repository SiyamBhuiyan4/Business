'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Calendar, TrendingUp, ShoppingBag, DollarSign, RefreshCw, Wallet, Pencil, X, Users } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format, subDays } from 'date-fns';

interface SalesAnalyticsProps {
  businessId: string;
  investment?: number;
  canManageInvestment?: boolean;
  canManageRevenue?: boolean;
  onInvestmentUpdated?: (value: number) => void;
}

const COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6', '#06b6d4'];

export default function SalesAnalytics({ businessId, investment = 0, canManageInvestment = false, canManageRevenue = false, onInvestmentUpdated }: SalesAnalyticsProps) {
  const [rangePreset, setRangePreset] = useState<'7d' | '30d' | 'custom'>('7d');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 6), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [showInvestment, setShowInvestment] = useState(false);
  const [investmentAdmins, setInvestmentAdmins] = useState<any[]>([]);
  const [loadingInvestment, setLoadingInvestment] = useState(false);
  const [showRevenue, setShowRevenue] = useState(false);
  const [revenueAdmins, setRevenueAdmins] = useState<any[]>([]);
  const [loadingRevenue, setLoadingRevenue] = useState(false);

  const openRevenueBreakdown = async () => {
    setShowRevenue(true);
    setLoadingRevenue(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/admin-revenue`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to load admin revenue');
      setRevenueAdmins(json.admins);
    } catch (error: any) { alert(error.message); setShowRevenue(false); } finally { setLoadingRevenue(false); }
  };

  const editAdminRevenue = async (admin: any) => {
    const raw = window.prompt(`Revenue held by ${admin.name} (BDT)`, String(admin.amount));
    if (raw === null) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount)) return alert('Enter a valid amount. Negative values are allowed.');
    const res = await fetch(`/api/businesses/${businessId}/admin-revenue`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminId: admin.id, amount }) });
    const json = await res.json();
    if (!res.ok) return alert(json.error || 'Unable to update admin revenue');
    setRevenueAdmins((items) => items.map((item) => item.id === admin.id ? { ...item, amount: json.amount } : item));
  };

  const openInvestmentBreakdown = async () => {
    setShowInvestment(true);
    setLoadingInvestment(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/admin-investment`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to load investments');
      setInvestmentAdmins(json.admins);
    } catch (error: any) { alert(error.message); setShowInvestment(false); } finally { setLoadingInvestment(false); }
  };

  const editAdminInvestment = async (admin: any) => {
    const raw = window.prompt(`Investment by ${admin.name} (BDT)`, String(admin.amount));
    if (raw === null) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount)) return alert('Enter a valid amount. Negative values are allowed.');
    const res = await fetch(`/api/businesses/${businessId}/admin-investment`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminId: admin.id, amount }) });
    const json = await res.json();
    if (!res.ok) return alert(json.error || 'Unable to update investment');
    setInvestmentAdmins((items) => items.map((item) => item.id === admin.id ? { ...item, amount: json.amount } : item));
    onInvestmentUpdated?.(json.total);
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/businesses/${businessId}/analytics?startDate=${startDate}&endDate=${endDate}`
      );
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [businessId, startDate, endDate]);

  const handlePresetChange = (preset: '7d' | '30d' | 'custom') => {
    setRangePreset(preset);
    const today = new Date();
    if (preset === '7d') {
      setStartDate(format(subDays(today, 6), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    } else if (preset === '30d') {
      setStartDate(format(subDays(today, 29), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Date Range Selector & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-slate-100">Sales & Revenue Analytics</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Preset Buttons */}
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => handlePresetChange('7d')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                rangePreset === '7d'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => handlePresetChange('30d')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                rangePreset === '30d'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setRangePreset('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                rangePreset === 'custom'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Custom
            </button>
          </div>

          {/* Custom Date Inputs */}
          {rangePreset === 'custom' && (
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-xl border border-slate-700">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none"
              />
              <span className="text-slate-500 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none"
              />
            </div>
          )}

          <button
            onClick={fetchAnalytics}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
            title="Refresh analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button type="button" onClick={openInvestmentBreakdown} className="text-left bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-800 hover:border-cyan-500/50 p-5 rounded-2xl shadow-xl relative overflow-hidden group transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl" />
          <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Invested</span><div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center"><Wallet className="w-5 h-5" /></div></div>
          <div className="mt-3 flex items-center gap-2"><div className="text-2xl lg:text-3xl font-extrabold text-white">{formatCurrency(investment)}</div></div>
          <div className="text-xs text-cyan-400 mt-1 font-medium">Business investment (BDT)</div>
          <span className="absolute bottom-4 right-4 text-[10px] font-semibold text-slate-500 group-hover:text-cyan-400">Click to view admins</span>
        </button>
        <button type="button" onClick={openRevenueBreakdown} className="text-left bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-800 hover:border-emerald-500/50 p-5 rounded-2xl shadow-xl relative overflow-hidden group transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Sales Revenue</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              ৳
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl lg:text-3xl font-extrabold text-white">
              {data ? formatCurrency(data.summary.totalSales) : '৳0'}
            </div>
            <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              Selected Period Revenue (BDT)
            </div>
          </div>
          <span className="absolute bottom-4 right-4 text-[10px] font-semibold text-slate-500 group-hover:text-emerald-400">Click to view admins</span>
        </button>

        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-800 p-5 rounded-2xl shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Orders</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl lg:text-3xl font-extrabold text-white">
              {data ? data.summary.totalOrders : 0}
            </div>
            <div className="text-xs text-amber-400 mt-1 flex items-center gap-1 font-medium">
              Completed & Pending Orders
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-800 p-5 rounded-2xl shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Avg Order Value</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl lg:text-3xl font-extrabold text-white">
              {data ? formatCurrency(data.summary.avgOrderValue) : '৳0'}
            </div>
            <div className="text-xs text-indigo-400 mt-1 flex items-center gap-1 font-medium">
              Average per Order
            </div>
          </div>
        </div>
      </div>

      {showInvestment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" onClick={() => setShowInvestment(false)}>
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400"><Wallet className="h-5 w-5" /></div><div><h3 className="font-bold text-white">Admin Investment Breakdown</h3><p className="text-xs text-slate-400">Investment contributed by each assigned admin</p></div></div><button onClick={() => setShowInvestment(false)} title="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button></div>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto p-5">{loadingInvestment ? <div className="py-10 text-center text-sm text-slate-400">Loading investments...</div> : investmentAdmins.length === 0 ? <div className="py-10 text-center text-sm text-slate-400">No admins are assigned to this business.</div> : investmentAdmins.map((admin) => <div key={admin.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4"><div className="min-w-0"><div className="truncate text-sm font-bold text-slate-100">{admin.name}</div><div className="truncate text-xs text-slate-500">@{admin.username || admin.email}</div></div><div className="ml-4 flex items-center gap-2"><span className={`text-lg font-extrabold ${admin.amount < 0 ? 'text-rose-400' : 'text-cyan-400'}`}>{formatCurrency(admin.amount)}</span>{canManageInvestment && <button onClick={() => editAdminInvestment(admin)} title="Edit admin investment" className="rounded-lg p-2 text-cyan-300 hover:bg-cyan-500/15"><Pencil className="h-4 w-4" /></button>}</div></div>)}</div>
          </div>
        </div>
      )}

      {showRevenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" onClick={() => setShowRevenue(false)}>
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 p-5">
              <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400"><Users className="h-5 w-5" /></div><div><h3 className="font-bold text-white">Admin Revenue Breakdown</h3><p className="text-xs text-slate-400">Revenue currently held by each assigned admin</p></div></div>
              <button onClick={() => setShowRevenue(false)} title="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto p-5">
              {loadingRevenue ? <div className="py-10 text-center text-sm text-slate-400">Loading admin revenue...</div> : revenueAdmins.length === 0 ? <div className="py-10 text-center text-sm text-slate-400">No admins are assigned to this business.</div> : revenueAdmins.map((admin) => (
                <div key={admin.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="min-w-0"><div className="truncate text-sm font-bold text-slate-100">{admin.name}</div><div className="truncate text-xs text-slate-500">@{admin.username || admin.email}</div></div>
                  <div className="ml-4 flex items-center gap-2"><span className={`text-lg font-extrabold ${admin.amount < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{formatCurrency(admin.amount)}</span>{canManageRevenue && <button onClick={() => editAdminRevenue(admin)} title="Edit admin revenue" className="rounded-lg p-2 text-cyan-300 hover:bg-cyan-500/15"><Pencil className="h-4 w-4" /></button>}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line / Bar Chart (Revenue Over Time) */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100">Revenue & Order Volume Over Time</h3>
              <p className="text-xs text-slate-400">Daily revenue (BDT ৳) and total count</p>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {data?.salesOverTime?.length || 0} Days
            </span>
          </div>

          <div className="h-72 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                Loading sales data...
              </div>
            ) : data?.salesOverTime?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.salesOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="displayDate" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis yAxisId="left" stroke="#10b981" fontSize={12} tickLine={false} tickFormatter={(val) => `৳${val}`} />
                  <YAxis yAxisId="right" orientation="right" stroke="#6366f1" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                    formatter={(value: any, name: string) => [
                      name === 'Revenue' ? formatCurrency(value) : value,
                      name,
                    ]}
                  />
                  <Bar yAxisId="right" dataKey="orderCount" name="Orders" fill="#6366f1" opacity={0.35} radius={[4, 4, 0, 0]} barSize={20} />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                No sales recorded for this period
              </div>
            )}
          </div>
        </div>

        {/* Pie Chart (Sales Breakdown by Product) */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100">Product Sales Breakdown</h3>
            <p className="text-xs text-slate-400">Revenue split across products</p>
          </div>

          <div className="h-64 w-full my-auto flex items-center justify-center">
            {loading ? (
              <div className="text-slate-500 text-sm">Loading breakdown...</div>
            ) : data?.salesByProduct?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.salesByProduct}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={45}
                    paddingAngle={4}
                  >
                    {data.salesByProduct.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                    formatter={(val: number) => [formatCurrency(val), 'Revenue']}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-xs text-slate-300">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-500 text-sm">No product data for selected range</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
