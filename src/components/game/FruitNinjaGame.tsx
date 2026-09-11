'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { FruitSliceEngine, GameOverReason } from './fruitGameEngine';

/**
 * Full-viewport ambient background slicing layer. It sits BEHIND real dashboard
 * UI (z-index below the app content) and dynamically excludes every real UI
 * element's bounding box from slicing, so cards/buttons/inputs/tables keep
 * working exactly as normal -- slicing only ever happens over empty background.
 *
 * Controls are hover-only: no click/press is required, just move the cursor
 * across a mushroom on empty background to slice it (trackpad swipe friendly).
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

const ENABLED_KEY = 'bizhub-mushroom-game-enabled';
const HIGH_SCORE_KEY = 'bizhub-mushroom-high-score';

function computeExclusionRects(): DOMRect[] {
  const rects: DOMRect[] = [];
  document.querySelectorAll(EXCLUSION_SELECTOR).forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) rects.push(r);
  });
  return rects;
}

type UiState = 'idle' | 'active' | 'gameover';

export default function FruitNinjaGame() {
  const [enabled, setEnabled] = useState(true);
  const [uiState, setUiState] = useState<UiState>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [combo, setCombo] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(20);
  const [gameOverInfo, setGameOverInfo] = useState<{ score: number; reason: GameOverReason } | null>(null);
  const [restartKey, setRestartKey] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<FruitSliceEngine | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ENABLED_KEY);
      if (saved !== null) setEnabled(saved === 'on');
      const hs = Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
      if (Number.isFinite(hs)) setHighScore(hs);
    } catch {
      // localStorage unavailable -- defaults stay as-is
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try { localStorage.setItem(ENABLED_KEY, next ? 'on' : 'off'); } catch {}
      return next;
    });
  }, []);

  const playAgain = useCallback(() => {
    setGameOverInfo(null);
    setUiState('idle');
    setScore(0);
    setMultiplier(1);
    setCombo(0);
    setSecondsLeft(20);
    engineRef.current?.reset();
  }, []);

  // Mount/unmount the Pixi engine with the toggle (and on restart)
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
        onActivate: () => { setUiState('active'); setSecondsLeft(20); },
        onCountdownTick: setSecondsLeft,
        onGameOver: (finalScore, reason) => {
          setUiState('gameover');
          setGameOverInfo({ score: finalScore, reason });
          setHighScore((prev) => {
            if (finalScore <= prev) return prev;
            try { localStorage.setItem(HIGH_SCORE_KEY, String(finalScore)); } catch {}
            return finalScore;
          });
        },
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
  }, [enabled, restartKey]);

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

      {/* Floating score / status - subtle, bottom-right */}
      <AnimatePresence>
        {enabled && (
          <motion.div
            data-game-ui
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="pointer-events-none fixed bottom-4 right-4 z-[2] rounded-2xl bg-black/30 px-3 py-1.5 text-right backdrop-blur-sm"
          >
            {uiState === 'idle' ? (
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Slice a mushroom to start</span>
            ) : (
              <>
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/50">Score </span>
                <span className="text-sm font-black tabular-nums text-white/90">{score}</span>
                {combo > 0 && <span className="ml-1.5 text-[10px] font-black text-amber-300">x{multiplier}</span>}
                {uiState === 'active' && (
                  <span className={`ml-2 text-[10px] font-bold tabular-nums ${secondsLeft <= 5 ? 'text-rose-400' : 'text-white/40'}`}>
                    {'⏱'} {secondsLeft}s
                  </span>
                )}
              </>
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

      {/* Game Over - small floating card, does NOT block or dim the rest of the dashboard */}
      <AnimatePresence>
        {gameOverInfo && (
          <motion.div
            data-game-ui
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="pointer-events-auto fixed bottom-16 right-4 z-[3] w-64 rounded-2xl border border-white/10 bg-slate-900/95 p-4 text-center shadow-2xl backdrop-blur-md"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
              {gameOverInfo.reason === 'bomb' ? 'Bomb Exploded!' : 'Inactivity Timeout'}
            </p>
            <p className="mt-1 text-[10px] text-slate-400">
              {gameOverInfo.reason === 'bomb' ? 'You sliced a bomb.' : "You went 20s without a slice."}
            </p>
            <p className="mt-2 text-3xl font-black text-white">{gameOverInfo.score}</p>
            <p className="text-[10px] text-slate-500">Final score {'·'} Best: {highScore}</p>
            <button
              onClick={playAgain}
              className="mt-3 w-full rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 hover:bg-amber-300"
            >
              Play Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Extends every page's scrollable height so there's always open, card-free
          space at the bottom to slice in freely. */}
      <div aria-hidden="true" style={{ height: '90vh' }} />
    </>
  );
}
