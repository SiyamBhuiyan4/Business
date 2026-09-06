'use client';

import React, { useState, useEffect } from 'react';
import { Flame, Calendar as CalendarIcon, X, Eye, PackageCheck, Info } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import SpotlightCard from '@/components/SpotlightCard';

interface SalesHeatmapProps {
  businessId: string;
}

interface HeatmapDay {
  date: string;
  revenue: number;
  orderCount: number;
  hasFireIcon: boolean;
}

export default function SalesHeatmap({ businessId }: SalesHeatmapProps) {
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);
  const [dayOrders, setDayOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const fetchHeatmap = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/analytics`);
      const json = await res.json();
      if (res.ok && json.heatmapData) {
        setHeatmapData(json.heatmapData);
      }
    } catch (err) {
      console.error('Failed to load heatmap data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatmap();
  }, [businessId]);

  const handleDayClick = async (day: HeatmapDay) => {
    setSelectedDay(day);
    setLoadingOrders(true);
    try {
      const res = await fetch(
        `/api/businesses/${businessId}/orders?deliveredDate=${day.date}`
      );
      const json = await res.json();
      if (res.ok && json.orders) {
        setDayOrders(json.orders);
      }
    } catch (err) {
      console.error('Failed to load day orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Determine background color intensity scale based on order volume / revenue
  const getShadingClass = (count: number) => {
    if (count === 0) return 'heatmap-tile heatmap-zero';
    if (count <= 3) return 'heatmap-tile heatmap-low';
    if (count <= 9) return 'heatmap-tile heatmap-medium';
    return 'heatmap-tile heatmap-high';
  };

  return (
    <div className="space-y-6">
      {/* Header & Legend */}
      <div className="analytics-glass p-5 rounded-2xl flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#0D9488]" />
            <h2 className="text-[1.15rem] font-bold text-[#0F172A]">Sales Calendar Heatmap</h2>
          </div>
          <p className="text-xs text-[#475569] mt-1">
            Daily delivered order volume. Peak days show a fire badge.
          </p>
        </div>

        {/* Legend */}
        <div className="heatmap-legend flex flex-wrap items-center gap-3 px-4 py-2 rounded-xl text-xs">
          <span className="text-[#334155] font-bold">Intensity:</span>
          <div className="flex items-center gap-1.5">
            <span className="legend-dot heatmap-zero" title="0 orders" />
            <span className="legend-dot heatmap-low" title="1-3 orders" />
            <span className="legend-dot heatmap-medium" title="4-9 orders" />
            <span className="legend-dot heatmap-high" title=">10 orders">🔥</span>
          </div>
          <span className="text-[#64748B] text-[10px] ml-1">Click a date to inspect</span>
        </div>
      </div>

      {/* Grid of Calendar Days */}
      <div className="analytics-glass p-6 rounded-2xl">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">Loading calendar heatmap...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3">
            {heatmapData.map((day) => {
              const parsedDate = parseISO(day.date);
              const dayNum = format(parsedDate, 'd');
              const monthName = format(parsedDate, 'MMM');
              const dayOfWeek = format(parsedDate, 'EEE');

              return (
                <SpotlightCard className="rounded-xl">
                <button
                  key={day.date}
                  onClick={() => handleDayClick(day)}
                  className={`relative flex flex-col justify-between p-3.5 rounded-xl border transition-all duration-150 group hover:scale-[1.03] hover:z-10 ${getShadingClass(
                    day.orderCount
                  )}`}
                >
                  {/* Fire Icon Overlay */}
                  {day.hasFireIcon && (
                    <div
                      className="heatmap-fire absolute -top-2 -right-2 rounded-full p-1"
                      title="High Volume Day (>10 Orders!)"
                    >
                      <Flame className="w-4 h-4 fill-amber-200 stroke-amber-950" />
                    </div>
                  )}

                  <div className="flex items-center justify-between w-full">
                    <span className="heatmap-date">
                      {monthName} {dayNum}
                    </span>
                    <span className="heatmap-weekday">{dayOfWeek}</span>
                  </div>

                  <div className="mt-3 text-left">
                    <div className="heatmap-value truncate">
                      {day.orderCount > 0 ? `${day.orderCount} Orders` : 'No Sales'}
                    </div>
                    <div className="heatmap-revenue">
                      {formatCurrency(day.revenue)}
                    </div>
                  </div>
                </button>
                </SpotlightCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Date Orders Detail Modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Orders for {formatDate(selectedDay.date)}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Total Revenue: <span className="text-emerald-400 font-bold">{formatCurrency(selectedDay.revenue)}</span> ({selectedDay.orderCount} orders)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDay(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {loadingOrders ? (
                <div className="py-12 text-center text-slate-400 text-sm">Fetching day orders...</div>
              ) : dayOrders.length > 0 ? (
                dayOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-slate-100 break-words">{ord.customerName}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            ord.orderType === 'MIXED'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}
                        >
                          {ord.orderType === 'MIXED' ? 'Mixed Order' : 'Single Product'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            ord.status === 'DELIVERED'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : ord.status === 'CANCELLED'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 break-words">
                        Contact: {ord.customerContact} | Address: {ord.deliveryAddress}
                      </div>
                      <div className="text-xs text-slate-300 mt-1 font-mono break-words">
                        Items: {ord.items.map((i: any) => `${i.product.name} (x${i.quantity})`).join(', ')}
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <div className="text-sm font-extrabold text-emerald-400">
                        {formatCurrency(ord.totalAmount)}
                      </div>
                      <div className="text-[10px] text-slate-500">ID: {ord.id.slice(0, 8)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-500 text-sm">
                  No orders recorded on this date
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 text-right">
              <button
                onClick={() => setSelectedDay(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
