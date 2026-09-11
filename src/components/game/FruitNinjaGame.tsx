'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { FruitSliceEngine } from './fruitGameEngine';

/**
 * Full-viewport ambient background slicing layer. It sits BEHIND real dashboard
 * UI (z-index below the app content) and dynamically excludes every real UI
 * element's bounding box from slicing, so cards/buttons/inputs/tables keep
 * working exactly as normal -- slicing only ever happens over empty background.
 */

// Selectors covering every real "card"/interactive surface this app renders.
// Anything matching these is a no-slice zone; everything else is fair game.
const EXCLUSION_SELECTOR = [
  'header',
  'form',
  'button',
  'input',
  'select',
  'textarea',
  'a[href]',
  'table',
  '[role="dialog"]',
  '.glass-panel',
  '.glass-button',
  '.analytics-glass',
  '.analytics-kpi',
  '.admin-profile-card',
  '.admin-stat',
  '.admin-mini-stat',
  '.product-card',
  '.order-toolbar',
  '.order-tabs',
  '.heatmap-tile',
  '.heatmap-legend',
  '.metric-tile',
  '.navbar-shell',
  '.navbar-dropdown',
  '.bulk-modal',
].join(', ');

const STORAGE_KEY = 'bizhub-mushroom-game-enabled';

function computeExclusionRects(): DOMRect[] {
  const rects: DOMRect[] = [];
  document.querySelectorAll(EXCLUSION_SELECTOR).forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) rects.push(r);
  });
  return rects;
}

export default function FruitNinjaGame() {
  const [enabled, setEnabled] = useState(true);
  const [score, setScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [combo, setCombo] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<FruitSliceEngine | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) setEnabled(saved === 'on');
    } catch {
      // localStorage unavailable -- default stays on
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off'); } catch {}
      return next;
    });
  }, []);

  // Mount/unmount the Pixi engine with the toggle
  useEffect(() => {
    if (!enabled || !containerRef.current) return;
    let cancelled = false;

    (async () => {
      const [PIXI, { FruitSliceEngine: Engine }] = await Promise.all([
        import('pixi.js'),
        import('./fruitGameEngine'),
      ]);
      if (cancelled || !containerRef.current) return;

      const engine = new Engine(containerRef.current, PIXI, {
        onScoreChange: setScore,
        onMultiplierChange: (m, c) => { setMultiplier(m); setCombo(c); },
      });
      engineRef.current = engine;
      engine.start();
      engine.setExclusionZones(computeExclusionRects());
    })();

    return () => {
      cancelled = true;
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [enabled]);

  // Keep exclusion zones fresh: on resize, on scroll, and on a slow poll to catch
  // dynamic content changes (data loading, tab switches) without wiring into every component.
  useEffect(() => {
    if (!enabled) return;

    let raf = 0;
    const refresh = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => engineRef.current?.setExclusionZones(computeExclusionRects()));
    };

    window.addEventListener('resize', refresh);
    window.addEventListener('scroll', refresh, { passive: true, capture: true });
    const interval = window.setInterval(refresh, 1000);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', refresh);
      window.removeEventListener('scroll', refresh, true);
      window.clearInterval(interval);
    };
  }, [enabled]);

  return (
    <>
      {/* Full-viewport ambient canvas -- sits behind real UI (z-1), never intercepts clicks on cards */}
      {enabled && (
        <div
          ref={containerRef}
          data-game-ui
          className="pointer-events-auto fixed inset-0 z-[1]"
          style={{ background: 'transparent' }}
        />
      )}

      {/* Floating score - subtle, bottom-right */}
      <AnimatePresence>
        {enabled && (
          <motion.div
            data-game-ui
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="pointer-events-none fixed bottom-4 right-4 z-[2] rounded-2xl bg-black/30 px-3 py-1.5 text-right backdrop-blur-sm"
          >
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/50">Mushroom score </span>
            <span className="text-sm font-black tabular-nums text-white/90">{score}</span>
            {combo > 0 && (
              <span className="ml-1.5 text-[10px] font-black text-amber-300">x{multiplier}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ON/OFF toggle - subtle, bottom-left */}
      <button
        data-game-ui
        onClick={toggle}
        title={enabled ? 'Turn off background slicing' : 'Turn on background slicing'}
        className="pointer-events-auto fixed bottom-4 left-4 z-[2] flex items-center gap-1.5 rounded-2xl bg-black/30 px-3 py-1.5 text-[10px] font-bold text-white/70 backdrop-blur-sm hover:text-white"
      >
        <span>{'\u{1F344}'}</span>
        <span>{enabled ? 'ON' : 'OFF'}</span>
      </button>

      {/* Extends every page's scrollable height so there's always open, card-free
          space at the bottom to slice in freely. */}
      <div aria-hidden="true" style={{ height: '60vh' }} />
    </>
  );
}
