'use client';

import React, { useEffect, useId, useRef } from 'react';

/**
 * Wraps a card so it behaves like a curtain: pinned along the top edge, gently swaying on
 * the other 3 sides in a continuous ambient "breeze", and draggable -- grab anywhere and the
 * content actually bends toward the pointer (real geometric displacement via an SVG
 * feDisplacementMap, not a fake shadow), springing back to flat the instant you let go,
 * the way real cloth settles. Everything here is imperative (refs + a throttled rAF loop,
 * no React state), so the constant ambient animation never triggers a re-render.
 */

const BUMP_W = 64;
const BUMP_H = 44;
const PUSH_INTERVAL_MS = 40; // ~25fps for the bump-map encode -- smooth for cloth, cheap on CPU
const WIND_AMP_X = 5.5;
const WIND_AMP_Y = 1.8;
const AMBIENT_COLOR_SCALE = 5;   // idle wind stays subtle
const PULL_COLOR_SCALE = 16;     // a drag should read as dramatically more than ambient wind
const PULL_UNIT_SCALE = 60;      // raw drag-delta sensitivity (bump units per fractional-drag unit)
const SPRING_STIFFNESS = 0.12;
const SPRING_DAMPING = 0.78;

export default function ClothCard({
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
  const filterId = `cloth-crumple-${useId().replace(/[:]/g, '')}`;
  const contentRef = useRef<HTMLDivElement>(null);
  const bumpImageRef = useRef<SVGFEImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // All interaction/animation state lives in refs, never React state -- the wind sway runs
  // every frame for as long as this card is mounted and must never cause a re-render.
  const draggingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const startRef = useRef({ u: 0.5, v: 0.5 });
  const pullRef = useRef({ u: 0.5, v: 0.5, dx: 0, dy: 0 });
  const velRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const lastPushRef = useRef(0);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = BUMP_W;
    canvas.height = BUMP_H;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgb(128,128,128)';
      ctx.fillRect(0, 0, BUMP_W, BUMP_H);
    }
    canvasRef.current = canvas;

    const pushCanvas = () => {
      const img = bumpImageRef.current;
      if (img) img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', canvas.toDataURL());
    };
    pushCanvas();

    const frame = (now: number) => {
      const ctx2 = canvas.getContext('2d');
      if (!ctx2) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }
      const t = now / 1000;
      const pull = pullRef.current;
      const img = ctx2.createImageData(BUMP_W, BUMP_H);

      for (let y = 0; y < BUMP_H; y++) {
        const v = y / (BUMP_H - 1);
        // Top (v=0) is pinned and barely moves; the rest eases toward full sway at the bottom.
        const pin = v ** 1.15;
        for (let x = 0; x < BUMP_W; x++) {
          const u = x / (BUMP_W - 1);

          let windDx = Math.sin(u * 6.0 + t * 1.3 + v * 2.0) * WIND_AMP_X + Math.sin(u * 2.2 - t * 0.6) * (WIND_AMP_X * 0.5);
          let windDy = Math.sin(u * 4.0 + t * 0.9 + v) * WIND_AMP_Y;
          windDx *= pin;
          windDy *= pin;

          let pullDx = 0;
          let pullDy = 0;
          if (pull.dx !== 0 || pull.dy !== 0) {
            const ddx = u - pull.u;
            const ddy = v - pull.v;
            const dist = Math.sqrt(ddx * ddx + ddy * ddy);
            const falloff = Math.max(0, 1 - dist / 0.6) ** 1.4;
            pullDx = pull.dx * falloff * pin;
            pullDy = pull.dy * falloff * pin;
          }

          const idx = (y * BUMP_W + x) * 4;
          img.data[idx] = Math.max(0, Math.min(255, 128 + windDx * AMBIENT_COLOR_SCALE + pullDx * PULL_COLOR_SCALE));
          img.data[idx + 1] = Math.max(0, Math.min(255, 128 + windDy * AMBIENT_COLOR_SCALE + pullDy * PULL_COLOR_SCALE));
          img.data[idx + 2] = 128;
          img.data[idx + 3] = 255;
        }
      }

      // Once released, ease the pull back to zero with a damped spring instead of an instant
      // snap -- the cloth "settles" the way real fabric does rather than teleporting flat.
      if (!draggingRef.current && (Math.abs(pull.dx) > 0.001 || Math.abs(pull.dy) > 0.001 || Math.abs(velRef.current.x) > 0.001 || Math.abs(velRef.current.y) > 0.001)) {
        const vel = velRef.current;
        vel.x += (0 - pull.dx) * SPRING_STIFFNESS;
        vel.x *= SPRING_DAMPING;
        pull.dx += vel.x;
        vel.y += (0 - pull.dy) * SPRING_STIFFNESS;
        vel.y *= SPRING_DAMPING;
        pull.dy += vel.y;
        if (Math.abs(pull.dx) < 0.001 && Math.abs(vel.x) < 0.001) { pull.dx = 0; vel.x = 0; }
        if (Math.abs(pull.dy) < 0.001 && Math.abs(vel.y) < 0.001) { pull.dy = 0; vel.y = 0; }
      }

      if (now - lastPushRef.current > PUSH_INTERVAL_MS) {
        lastPushRef.current = now;
        ctx2.putImageData(img, 0, 0);
        pushCanvas();
      }
      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const toFraction = (clientX: number, clientY: number) => {
    const rect = contentRef.current!.getBoundingClientRect();
    return { u: (clientX - rect.left) / rect.width, v: (clientY - rect.top) / rect.height };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = contentRef.current;
    if (!el) return;
    draggingRef.current = true;
    pointerIdRef.current = e.pointerId;
    el.setPointerCapture(e.pointerId);
    el.classList.add('cloth-dragging');
    const { u, v } = toFraction(e.clientX, e.clientY);
    startRef.current = { u, v };
    pullRef.current = { u, v, dx: 0, dy: 0 };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const { u, v } = toFraction(e.clientX, e.clientY);
    const start = startRef.current;
    pullRef.current.dx = (u - start.u) * PULL_UNIT_SCALE;
    pullRef.current.dy = (v - start.v) * PULL_UNIT_SCALE;
  };

  const endDrag = () => {
    draggingRef.current = false;
    contentRef.current?.classList.remove('cloth-dragging');
  };

  return (
    <div className={`cloth-card-wrap ${wrapperClassName}`}>
      <span className="cloth-pin" style={{ left: '18%' }} aria-hidden="true" />
      <span className="cloth-pin" style={{ left: '50%' }} aria-hidden="true" />
      <span className="cloth-pin" style={{ left: '82%' }} aria-hidden="true" />
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feImage ref={bumpImageRef} result="bumpmap" />
            <feDisplacementMap in="SourceGraphic" in2="bumpmap" scale={30} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      <div
        ref={contentRef}
        className={`cloth-card-content ${className}`}
        style={{ filter: `url(#${filterId})` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {children}
      </div>
    </div>
  );
}
