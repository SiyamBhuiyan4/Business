'use client';

import React, { useEffect, useId, useRef } from 'react';

/**
 * Wraps a card so it behaves like a curtain: pinned along the top edge, gently swaying on
 * the other 3 sides in a continuous ambient "breeze" (layered traveling waves + a slow gust
 * modulation, not a single flat sine, for an organic flag-like ripple), and disturbed purely
 * by hovering -- no click or press needed at all, matching the rest of this app's hover-only
 * interactions. Just moving the cursor over the card spawns a trail of ripples that follow
 * it, the way waving a hand just above fabric stirs it without ever touching it -- faster
 * motion pushes harder. Everything eases back to the idle sway on its own via each ripple's
 * own decay, the way real fabric settles.
 */

const BUMP_W = 72;
const BUMP_H = 50;
const PUSH_INTERVAL_MS = 40; // ~25fps for the bump-map encode -- smooth for cloth, cheap on CPU

const WIND_COLOR_SCALE = 10;

const IMPULSE_DURATION_S = 1;
const RIPPLE_SPEED = 1.4; // fractional-units/sec the ring expands
const IMPULSE_AMP = 150;
const MAX_IMPULSES = 10; // a continuous hover trail needs more overlapping ripples than a single tap did
const RADIAL_WEIGHT = 0.35; // outward "ring" component of each ripple
const DIRECTIONAL_WEIGHT = 1.1; // forward "push" component along the hover's direction of travel --
// dominant on purpose, so a sweep of overlapping ripples reinforces into one coherent wave
// instead of adjacent radial rings partly cancelling each other out.

// Hover-driven spawning: a new ripple is added as the cursor moves, strength scaled by how
// fast it's moving -- a slow drift barely stirs the cloth, a fast swipe pushes it hard.
const HOVER_SPAWN_THROTTLE_MS = 30;
const MIN_HOVER_SPEED = 0.0006; // fractional-units per ms -- filters out sub-pixel jitter
const SPEED_TO_STRENGTH = 240;
const MIN_STRENGTH = 0.45;
const MAX_STRENGTH = 2.2;

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
  strength: number;
  /** Normalized direction the cursor was moving when this ripple spawned. */
  dirU: number;
  dirV: number;
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
  const impulsesRef = useRef<Impulse[]>([]);
  const lastHoverRef = useRef<{ u: number; v: number; t: number } | null>(null);
  const lastSpawnRef = useRef(0);
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

          // Each point the cursor passed over stays disturbed for a moment and fades in place --
          // a static Gaussian blob, not an expanding ring -- so a hover trail builds up into one
          // continuous, coherent stir along the whole recent path instead of a series of thin
          // rings that only brush past each pixel for an instant.
          for (const im of impulses) {
            const age = t - im.start;
            const decay = Math.max(0, 1 - age / IMPULSE_DURATION_S);
            const ddx = u - im.u;
            const ddy = v - im.v;
            const distSq = ddx * ddx + ddy * ddy;
            const dist = Math.sqrt(distSq) || 0.0001;
            const blobRadius = 0.22;
            const falloff = Math.exp(-distSq / (2 * blobRadius * blobRadius));
            const amp = IMPULSE_AMP * im.strength * decay * falloff * pin;
            dx += ((ddx / dist) * RADIAL_WEIGHT + im.dirU * DIRECTIONAL_WEIGHT) * amp;
            dy += ((ddy / dist) * RADIAL_WEIGHT + im.dirV * DIRECTIONAL_WEIGHT) * amp;
          }

          const idx = (y * BUMP_W + x) * 4;
          img.data[idx] = Math.max(0, Math.min(255, 128 + dx * WIND_COLOR_SCALE));
          img.data[idx + 1] = Math.max(0, Math.min(255, 128 + dy * WIND_COLOR_SCALE));
          img.data[idx + 2] = 128;
          img.data[idx + 3] = 255;
        }
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

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const { u, v } = toFraction(e.clientX, e.clientY);
    const now = performance.now();
    const last = lastHoverRef.current;

    if (last) {
      const dt = now - last.t;
      if (dt > 4) {
        const du = u - last.u;
        const dv = v - last.v;
        const dist = Math.sqrt(du * du + dv * dv);
        const speed = dist / dt;
        if (speed > MIN_HOVER_SPEED && now - lastSpawnRef.current > HOVER_SPAWN_THROTTLE_MS) {
          lastSpawnRef.current = now;
          const strength = Math.max(MIN_STRENGTH, Math.min(MAX_STRENGTH, speed * SPEED_TO_STRENGTH));
          impulsesRef.current = [
            ...impulsesRef.current.slice(-(MAX_IMPULSES - 1)),
            { u, v, start: now / 1000, strength, dirU: du / dist, dirV: dv / dist },
          ];
        }
      }
    }
    lastHoverRef.current = { u, v, t: now };
  };

  const handlePointerLeave = () => {
    // Avoid a fake huge-speed spike (and an oversized ripple) the next time the cursor enters
    // from a completely different spot.
    lastHoverRef.current = null;
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
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {children}
      </div>
    </div>
  );
}
