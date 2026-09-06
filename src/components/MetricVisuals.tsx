'use client';

import React, { useEffect, useRef } from 'react';
import { Boxes, Package, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export function NetworkGlobe() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; const ctx = canvas?.getContext('2d'); if (!canvas || !ctx) return;
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

function Tile({ children, className = '' }: { children: React.ReactNode; className?: string }) { return <div className={`metric-tile ${className}`}>{children}</div>; }

export function InvestmentMetric({ value }: { value: number }) {
  const bars = [34, 52, 42, 68, 55, 82, 64];
  return <Tile><div className="metric-label">Investment</div><div className="metric-value text-[#A6633C]">{formatCurrency(value || 0)}</div><div className="metric-bars">{bars.map((height, i) => <span key={i} style={{ height: `${height}%`, animationDelay: `${i * 55}ms` }} />)}</div></Tile>;
}

export function SalesMetric({ value }: { value: number }) {
  return <Tile><div className="metric-label">Today&apos;s Sales</div><div className="metric-value text-[#1A535C]">{formatCurrency(value || 0)}</div><svg className="metric-spark" viewBox="0 0 130 42" role="img" aria-label="Sales trend"><defs><linearGradient id="sales-fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#226D68" stopOpacity=".28" /><stop offset="1" stopColor="#226D68" stopOpacity="0" /></linearGradient></defs><path className="spark-fill" d="M2 35 C18 28 20 31 34 24 S54 27 66 16 S83 22 95 11 S113 15 128 4 V42 H2Z" /><path className="spark-line" d="M2 35 C18 28 20 31 34 24 S54 27 66 16 S83 22 95 11 S113 15 128 4" /><circle cx="128" cy="4" r="3" /></svg></Tile>;
}

export function OrdersMetric({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(8, (value || 0) * 14));
  return <Tile><div className="metric-label">Pending Orders</div><div className="metric-gauge"><svg viewBox="0 0 42 42"><circle className="gauge-track" cx="21" cy="21" r="16" /><circle className="gauge-value" cx="21" cy="21" r="16" style={{ '--gauge-pct': `${pct}` } as React.CSSProperties} /></svg><strong>{value || 0}</strong></div></Tile>;
}

export function ProductsMetric({ value }: { value: number }) {
  return <Tile><div className="metric-label">Products</div><div className="metric-value text-[#2B2D42]">{value || 0}<span className="metric-unit">items</span></div><div className="icon-matrix">{[Boxes, Package, ShoppingBag, Boxes, Package, ShoppingBag].map((Icon, i) => <span key={i}><Icon /></span>)}</div></Tile>;
}
