'use client';

import React, { useEffect, useId, useRef } from 'react';

/**
 * Wraps a card so it behaves like a curtain: pinned along the top edge, gently swaying on
 * the other 3 sides in a continuous ambient "breeze" (layered traveling waves + a slow gust
 * modulation, not a single flat sine, for an organic flag-like ripple), and interactive two
 * ways -- a tap sends an expanding ring ripple out from that point (like a stone dropped in
 * water), and a drag bends the content toward the pointer, both via a real SVG
 * feDisplacementMap driven by a small offscreen canvas bump map. Everything eases back to the
 * idle sway on release via a damped spring, the way real fabric settles -- no reset needed.
 */

const BUMP_W = 72;
const BUMP_H = 50;
const PUSH_INTERVAL_MS = 40; // ~25fps for the bump-map encode -- smooth for cloth, cheap on CPU

const WIND_COLOR_SCALE = 10;
const PULL_COLOR_SCALE = 11;
const PULL_UNIT_SCALE = 240; // raw drag-delta sensitivity (bump units per fractional-drag unit) -- a real, modest mouse drag is much shorter than a synthetic test drag, so this has to react strongly to small movements
const SPRING_STIFFNESS = 0.14;
const SPRING_DAMPING = 0.76;

const IMPULSE_DURATION_S = 1.1;
const RIPPLE_SPEED = 1.4; // fractional-units/sec the ring expands
const IMPULSE_AMP = 95;
const MAX_IMPULSES = 4;

// A feImage with no source on its very first paint gets resolved by some browsers as an
// invalid filter input -- and the whole referencing filter then never applies at all, even
// after a valid href is set later via the ref. Giving it *some* valid image synchronously on
// the very first render (before any JS can run) avoids that trap entirely.
const NEUTRAL_BUMP_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='1' height='1' fill='rgb(128,128,128)'/%3E%3C/svg%3E";

interface Impulse {
  u: number;
  v: number;
  start: number;
}

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
  const startRef = useRef({ u: 0.5, v: 0.5 });
  const pullRef = useRef({ u: 0.5, v: 0.5, dx: 0, dy: 0 });
  const velRef = useRef({ x: 0, y: 0 });
  const impulsesRef = useRef<Impulse[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastPushRef = useRef(0);
  const gustSeedRef = useRef(0);

  useEffect(() => {
    gustSeedRef.current = Math.random() * 100;
    const canvas = document.createElement('canvas');
    canvas.width = BUMP_W;
    canvas.height = BUMP_H;
    canvasRef.current = canvas;

    const pushCanvas = () => {
      const img = bumpImageRef.current;
      if (img) img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', canvas.toDataURL());
    };

    const frame = (now: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }
      const t = now / 1000;
      const gust = 0.65 + 0.35 * Math.sin(t * 0.18 + gustSeedRef.current) + 0.15 * Math.sin(t * 0.41 + gustSeedRef.current * 2);
      const pull = pullRef.current;

      impulsesRef.current = impulsesRef.current.filter((im) => t - im.start < IMPULSE_DURATION_S);
      const impulses = impulsesRef.current;

      const img = ctx.createImageData(BUMP_W, BUMP_H);
      for (let y = 0; y < BUMP_H; y++) {
        const v = y / (BUMP_H - 1);
        // Top (v=0) is pinned and barely moves; the rest eases toward full sway at the bottom.
        const pin = v ** 1.1;
        for (let x = 0; x < BUMP_W; x++) {
          const u = x / (BUMP_W - 1);

          // Layered traveling waves at irrational frequency/speed ratios (not one flat sine, and
          // never two waves that stay in lockstep) for an organic flag-like ripple, plus a slow
          // "gust" intensity so the wind never feels perfectly mechanical/periodic.
          let dx = Math.sin(u * 7.5 + t * 2.1 - v * 3.2) * 10 * gust
                 + Math.sin(u * 2.6 - t * 0.85 + v * 1.1) * 6.5 * gust
                 + Math.sin(u * 15 + t * 4.3) * 2.8 * gust * pin
                 + Math.sin(u * 23.7 - t * 6.1 + v * 5.3) * 1.4 * gust * pin;
          let dy = Math.sin(u * 4.5 + t * 1.5 + v * 2.0) * 3.6 * gust
                 + Math.sin(u * 9 - t * 2.6) * 1.6 * gust * pin
                 + Math.sin(u * 17.3 + t * 3.7 - v * 4.1) * 0.9 * gust * pin;
          dx *= pin;
          dy *= pin;

          // Expanding ring ripple(s) from taps -- like a stone dropped in water / a poke in
          // fabric, independent of whether the pointer is actively dragging.
          for (const im of impulses) {
            const age = t - im.start;
            const decay = 1 - age / IMPULSE_DURATION_S;
            const ringR = age * RIPPLE_SPEED;
            const ddx = u - im.u;
            const ddy = v - im.v;
            const dist = Math.sqrt(ddx * ddx + ddy * ddy) || 0.0001;
            const ringWidth = 0.16;
            const ringFactor = Math.exp(-((dist - ringR) ** 2) / (2 * ringWidth * ringWidth));
            const amp = IMPULSE_AMP * decay * ringFactor * pin;
            dx += (ddx / dist) * amp;
            dy += (ddy / dist) * amp;
          }

          // Active drag pull -- bends toward the pointer, softened near the pinned top.
          let pullDx = 0;
          let pullDy = 0;
          if (pull.dx !== 0 || pull.dy !== 0) {
            const ddx = u - pull.u;
            const ddy = v - pull.v;
            const dist = Math.sqrt(ddx * ddx + ddy * ddy);
            const falloff = Math.max(0, 1 - dist / 0.7) ** 1.2;
            pullDx = pull.dx * falloff * pin;
            pullDy = pull.dy * falloff * pin;
          }

          const idx = (y * BUMP_W + x) * 4;
          img.data[idx] = Math.max(0, Math.min(255, 128 + dx * WIND_COLOR_SCALE + pullDx * PULL_COLOR_SCALE));
          img.data[idx + 1] = Math.max(0, Math.min(255, 128 + dy * WIND_COLOR_SCALE + pullDy * PULL_COLOR_SCALE));
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
        ctx.putImageData(img, 0, 0);
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
    const { u, v } = toFraction(e.clientX, e.clientY);

    // Set up drag/impulse state FIRST -- setPointerCapture can throw (invalid pointer id,
    // certain input devices/browsers), and if that happens before this, the rest of the
    // handler silently never runs and the card stops reacting to input at all.
    draggingRef.current = true;
    startRef.current = { u, v };
    pullRef.current = { u, v, dx: 0, dy: 0 };
    impulsesRef.current = [...impulsesRef.current.slice(-(MAX_IMPULSES - 1)), { u, v, start: performance.now() / 1000 }];
    el.classList.add('cloth-dragging');

    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // Non-essential -- dragging still works via window-level pointermove/up below.
    }
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
          <filter id={filterId} x="-25%" y="-25%" width="150%" height="150%">
            <feImage ref={bumpImageRef} xlinkHref={NEUTRAL_BUMP_PLACEHOLDER} result="bumpmap" />
            <feDisplacementMap in="SourceGraphic" in2="bumpmap" scale={62} xChannelSelector="R" yChannelSelector="G" />
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
