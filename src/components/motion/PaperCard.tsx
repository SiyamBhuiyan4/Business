'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';

/**
 * Wraps a card so clicking anywhere on it presses a real, geometric dent into the content
 * (text/charts actually bend, not a fake shadow overlay) via an SVG feDisplacementMap driven
 * by a small offscreen canvas "bump map" -- every click paints another soft dent onto that
 * canvas and re-pushes it into the filter. Reset smoothly animates the bump map back to a
 * neutral (zero-displacement) state instead of snapping flat instantly.
 */

const BUMP_W = 300;
const BUMP_H = 200;
const MAX_DENTS = 14;
const RESET_DURATION_MS = 550;

export default function PaperCard({
  children,
  className = '',
  wrapperClassName = '',
}: {
  children: React.ReactNode;
  /** Applied to the actual filtered content box (visual card styling: background, padding, radius). */
  className?: string;
  /** Applied to the outer wrapper -- use this for grid/layout placement (e.g. `lg:col-span-2`)
   * since the wrapper, not the filtered content div, is the real grid/flex item. */
  wrapperClassName?: string;
}) {
  const filterId = `paper-crumple-${useId().replace(/[:]/g, '')}`;
  const contentRef = useRef<HTMLDivElement>(null);
  const bumpImageRef = useRef<SVGFEImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dentCountRef = useRef(0);
  const animRef = useRef<number | null>(null);
  const [showReset, setShowReset] = useState(false);

  const pushCanvas = () => {
    const canvas = canvasRef.current;
    const img = bumpImageRef.current;
    if (!canvas || !img) return;
    img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', canvas.toDataURL());
  };

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = BUMP_W;
    canvas.height = BUMP_H;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Neutral gray = zero displacement on both the R (x) and G (y) channels.
      ctx.fillStyle = 'rgb(128,128,128)';
      ctx.fillRect(0, 0, BUMP_W, BUMP_H);
    }
    canvasRef.current = canvas;
    pushCanvas();
    return () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    const el = contentRef.current;
    if (!canvas || !el) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const cx = px * BUMP_W;
    const cy = py * BUMP_H;
    const r = 26 + Math.random() * 10;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, 'rgba(90,150,128,1)');
    grad.addColorStop(0.55, 'rgba(150,110,128,0.9)');
    grad.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    pushCanvas();

    dentCountRef.current = Math.min(dentCountRef.current + 1, MAX_DENTS);
    setShowReset(true);
  };

  const handleReset = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const from = ctx.getImageData(0, 0, BUMP_W, BUMP_H);
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / RESET_DURATION_MS);
      const ease = 1 - (1 - t) ** 3;
      const img = ctx.createImageData(BUMP_W, BUMP_H);
      for (let i = 0; i < from.data.length; i += 4) {
        img.data[i] = from.data[i] + (128 - from.data[i]) * ease;
        img.data[i + 1] = from.data[i + 1] + (128 - from.data[i + 1]) * ease;
        img.data[i + 2] = 128;
        img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      pushCanvas();
      if (t < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        dentCountRef.current = 0;
        setShowReset(false);
        animRef.current = null;
      }
    };

    if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(step);
  };

  return (
    <div className={`paper-card-wrap ${wrapperClassName}`}>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feImage ref={bumpImageRef} result="bumpmap" />
            <feDisplacementMap in="SourceGraphic" in2="bumpmap" scale={34} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      <div ref={contentRef} className={className} style={{ filter: `url(#${filterId})`, cursor: 'crosshair' }} onClick={handleClick}>
        {children}
      </div>
      {showReset && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleReset();
          }}
          className="paper-reset-btn"
          title="Flatten back out"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      )}
    </div>
  );
}
