'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Boxes, Package, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export function NetworkGlobe() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; const ctx = canvas?.getContext('2d'); if (!canvas || !ctx || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0; let w = 0; let h = 0;
    const resize = () => { const d = Math.min(devicePixelRatio || 1, 2); w = canvas.clientWidth; h = canvas.clientHeight; canvas.width = w * d; canvas.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    const nodes = Array.from({ length: 150 }, (_, i) => ({ lat: -1.42 + (i % 19) * .158, lon: (i * 2.399) % (Math.PI * 2), size: 1.2 + i % 3 * .35 }));
    const draw = (time: number) => {
      ctx.clearRect(0, 0, w, h); const cx = w / 2; const cy = h / 2; const r = Math.min(w, h) * .47; const spin = time * .00035;
      const points = nodes.map((n) => { const lon = n.lon + spin; const x3 = Math.cos(n.lat) * Math.cos(lon); const z3 = Math.cos(n.lat) * Math.sin(lon); return { x: cx + x3 * r, y: cy + Math.sin(n.lat) * r, z: z3, size: n.size }; });
      ctx.strokeStyle = 'rgba(200,138,88,.4)'; ctx.lineWidth = .65;
      points.forEach((p, i) => points.slice(i + 1).forEach((q) => { const d = Math.hypot(p.x - q.x, p.y - q.y); if (d < r * .55 && p.z > -.25 && q.z > -.25) { ctx.globalAlpha = .65 * (1 - d / (r * .55)); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); } }));
      points.forEach((p, i) => { if (p.z < -.5) return; ctx.globalAlpha = .55 + p.z * .4; ctx.fillStyle = i % 4 === 0 ? '#FFD0A8' : '#C88A58'; ctx.shadowBlur = 7; ctx.shadowColor = '#C88A58'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + Math.sin(time * .003 + i) * .18), 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; });
      ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(26,83,92,.16)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * .3, 0, 0, Math.PI * 2); ctx.stroke();
      raf = requestAnimationFrame(draw);
    };
    resize(); window.addEventListener('resize', resize); raf = requestAnimationFrame(draw); return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none h-full w-full" />;
}

function Tile({ children, className = '', hovered = false, onMouseEnter, onMouseLeave }: { children: React.ReactNode; className?: string; hovered?: boolean; onMouseEnter?: () => void; onMouseLeave?: () => void }) {
  // .metric-tile clips its own decorative bars/sparks with overflow:hidden; open it up
  // only while hovered so the popover (positioned outside the tile's own box) isn't clipped.
  return (
    <div className={`metric-tile ${className}`} style={hovered ? { overflow: 'visible' } : undefined} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {children}
    </div>
  );
}

/** Lazily fetches `url` the first time the tile is hovered, then caches the result for
 * subsequent hovers. Returns null data (no popover) if `url` is not provided yet. */
function useHoverFetch<T>(url: string | null) {
  const [hovered, setHovered] = useState(false);
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: boolean; fetched: boolean }>({
    data: null, loading: false, error: false, fetched: false,
  });

  const onMouseEnter = () => {
    setHovered(true);
    if (!url || state.fetched || state.loading) return;
    setState((s) => ({ ...s, loading: true }));
    fetch(url)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((json) => setState({ data: json, loading: false, error: false, fetched: true }))
      .catch(() => setState({ data: null, loading: false, error: true, fetched: true }));
  };
  const onMouseLeave = () => setHovered(false);

  return { hovered, onMouseEnter, onMouseLeave, ...state };
}

function Popover({ loading, error, empty, children }: { loading: boolean; error: boolean; empty?: boolean; children: React.ReactNode }) {
  return (
    <div className="metric-popover" role="tooltip">
      {loading ? (
        <div className="metric-popover-loading">Loading…</div>
      ) : error ? (
        <div className="metric-popover-loading">Details unavailable</div>
      ) : empty ? (
        <div className="metric-popover-empty">Nothing to show yet</div>
      ) : (
        children
      )}
    </div>
  );
}

export function InvestmentMetric({ value, businessId }: { value: number; businessId?: string }) {
  const bars = [34, 52, 42, 68, 55, 82, 64];
  const { hovered, onMouseEnter, onMouseLeave, data, loading, error } = useHoverFetch<{ admins: { id: string; name: string; amount: number }[] }>(
    businessId ? `/api/businesses/${businessId}/admin-investment` : null
  );
  const rows = (data?.admins || []).filter((a) => a.amount > 0).sort((a, b) => b.amount - a.amount);

  return (
    <Tile hovered={hovered} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div className="metric-label">Investment</div>
      <div className="metric-value text-[#A6633C]">{formatCurrency(value || 0)}</div>
      <div className="metric-bars">{bars.map((height, i) => <span key={i} style={{ height: `${height}%`, animationDelay: `${i * 55}ms` }} />)}</div>
      {hovered && businessId && (
        <Popover loading={loading} error={error} empty={rows.length === 0}>
          <div className="metric-popover-list">
            {rows.slice(0, 4).map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate min-w-0">{a.name}</span>
                <b>{formatCurrency(a.amount)}</b>
              </div>
            ))}
            {rows.length > 4 && <div className="metric-popover-more">+{rows.length - 4} more</div>}
          </div>
        </Popover>
      )}
    </Tile>
  );
}

export function SalesMetric({ value, businessId }: { value: number; businessId?: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const { hovered, onMouseEnter, onMouseLeave, data, loading, error } = useHoverFetch<{ salesByProduct: { name: string; revenue: number; count: number }[] }>(
    businessId ? `/api/businesses/${businessId}/analytics?startDate=${today}&endDate=${today}` : null
  );
  const rows = (data?.salesByProduct || []).slice().sort((a, b) => b.revenue - a.revenue);

  return (
    <Tile className="metric-sales" hovered={hovered} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div className="metric-label">Today&apos;s Sales</div>
      <div className="metric-value">{formatCurrency(value || 0)}</div>
      <svg className="metric-spark" viewBox="0 0 130 42" role="img" aria-label="Sales trend"><path className="spark-fill" d="M2 35 C18 28 20 31 34 24 S54 27 66 16 S83 22 95 11 S113 15 128 4 V42 H2Z" /><path className="spark-line" d="M2 35 C18 28 20 31 34 24 S54 27 66 16 S83 22 95 11 S113 15 128 4" /><circle cx="128" cy="4" r="3" /></svg>
      {hovered && businessId && (
        <Popover loading={loading} error={error} empty={rows.length === 0}>
          <div className="metric-popover-list">
            {rows.slice(0, 4).map((p) => (
              <div key={p.name} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate min-w-0">{p.name}</span>
                <b>{formatCurrency(p.revenue)}</b>
              </div>
            ))}
            {rows.length > 4 && <div className="metric-popover-more">+{rows.length - 4} more</div>}
          </div>
        </Popover>
      )}
    </Tile>
  );
}

export function OrdersMetric({ value, businessId }: { value: number; businessId?: string }) {
  const pct = Math.min(100, Math.max(8, (value || 0) * 14));
  const { hovered, onMouseEnter, onMouseLeave, data, loading, error } = useHoverFetch<{ orders: { id: string; customerName: string; totalAmount: number }[] }>(
    businessId ? `/api/businesses/${businessId}/orders?status=PENDING` : null
  );
  const rows = data?.orders || [];

  return (
    <Tile className="metric-orders" hovered={hovered} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div className="metric-label">Pending Orders <span aria-hidden="true" className="text-[#D97706]">⚠</span></div>
      <div className="metric-gauge"><svg viewBox="0 0 42 42"><circle className="gauge-track" cx="21" cy="21" r="16" /><circle className="gauge-value" cx="21" cy="21" r="16" style={{ '--gauge-pct': `${pct}` } as React.CSSProperties} /></svg><strong>{value || 0}</strong></div>
      {hovered && businessId && (
        <Popover loading={loading} error={error} empty={rows.length === 0}>
          <div className="metric-popover-list">
            {rows.slice(0, 4).map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate min-w-0">{o.customerName}</span>
                <b>{formatCurrency(o.totalAmount)}</b>
              </div>
            ))}
            {rows.length > 4 && <div className="metric-popover-more">+{rows.length - 4} more</div>}
          </div>
        </Popover>
      )}
    </Tile>
  );
}

export function ProductsMetric({ value, businessId }: { value: number; businessId?: string }) {
  const { hovered, onMouseEnter, onMouseLeave, data, loading, error } = useHoverFetch<{ products: { id: string; name: string; isAvailable: boolean }[] }>(
    businessId ? `/api/businesses/${businessId}/products` : null
  );
  const products = data?.products || [];
  const outOfStock = products.filter((p) => !p.isAvailable);

  return (
    <Tile className="metric-products" hovered={hovered} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div className="metric-label">Products</div>
      <div className="metric-value">{value || 0}<span className="metric-unit">items</span></div>
      <div className="icon-matrix">{[Boxes, Package, ShoppingBag, Boxes, Package, ShoppingBag].map((Icon, i) => <span key={i}><Icon /></span>)}</div>
      {hovered && businessId && (
        <Popover loading={loading} error={error} empty={products.length === 0}>
          <div className="metric-popover-summary">
            <div><b>{products.length - outOfStock.length}</b>in stock</div>
            <div><b>{outOfStock.length}</b>out of stock</div>
          </div>
        </Popover>
      )}
    </Tile>
  );
}
