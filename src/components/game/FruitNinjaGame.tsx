'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { GameOverReason } from './fruitGameEngine';
import { useMushroomGame } from './MushroomGameContext';

/**
 * Full-viewport ambient background slicing layer. It sits BEHIND real dashboard
 * UI (z-index below the app content) and dynamically excludes every real UI
 * element's bounding box from slicing, so cards/buttons/inputs/tables keep
 * working exactly as normal -- slicing only ever happens over empty background.
 *
 * Controls are hover-only: no click/press is required, just move the cursor
 * across a mushroom on empty background to slice it (trackpad swipe friendly).
 *
 * Game Over is seamless and automatic: no modal, no button. The engine wipes
 * the board and drops back to idle the instant a bomb is sliced or the 20s
 * inactivity timer expires; the host just flashes the final score briefly in
 * the same small HUD widget, then the very next slice starts a new match.
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

const HIGH_SCORE_KEY = 'bizhub-mushroom-high-score';
const FLASH_DURATION_MS = 2200;

function computeExclusionRects(): DOMRect[] {
  const rects: DOMRect[] = [];
  document.querySelectorAll(EXCLUSION_SELECTOR).forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) rects.push(r);
  });
  return rects;
}

type UiState = 'idle' | 'active';

export default function FruitNinjaGame() {
  const { enabled } = useMushroomGame();
  const [uiState, setUiState] = useState<UiState>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [combo, setCombo] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(20);
  const [flashInfo, setFlashInfo] = useState<{ score: number; reason: GameOverReason } | null>(null);
  const [bombFxKey, setBombFxKey] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<import('./fruitGameEngine').FruitSliceEngine | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);
  const bombFxTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const hs = Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
      if (Number.isFinite(hs)) setHighScore(hs);
    } catch {
      // localStorage unavailable -- default stays as-is
    }
  }, []);

  const clearFlashTimeout = useCallback(() => {
    if (flashTimeoutRef.current !== null) {
      window.clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }
  }, []);

  // Bomb impact FX: a brief canvas shake (~400ms) + a red vignette that fades over
  // ~1s. Scoped to the game's own layer + a decorative overlay only -- never to
  // real dashboard UI -- so it reads as an impact without ever jittering a button
  // or table. The shake is applied imperatively (classList + a forced reflow)
  // rather than through React state/rAF so it fires the instant a bomb is sliced,
  // independent of paint timing; the vignette restarts via bombFxKey remounting
  // a fresh element, so back-to-back bombs both re-trigger cleanly.
  const [vignetteActive, setVignetteActive] = useState(false);
  const shakeTimeoutRef = useRef<number | null>(null);
  const triggerBombFx = useCallback(() => {
    setBombFxKey((k) => k + 1);
    setVignetteActive(true);
    if (bombFxTimeoutRef.current !== null) window.clearTimeout(bombFxTimeoutRef.current);
    bombFxTimeoutRef.current = window.setTimeout(() => setVignetteActive(false), 1000);

    const el = containerRef.current;
    if (el) {
      el.classList.remove('bomb-shake');
      void el.offsetWidth; // force reflow so the animation restarts even back-to-back
      el.classList.add('bomb-shake');
    }
    if (shakeTimeoutRef.current !== null) window.clearTimeout(shakeTimeoutRef.current);
    shakeTimeoutRef.current = window.setTimeout(() => el?.classList.remove('bomb-shake'), 420);
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
        onActivate: () => {
          // A new match just started -- drop any lingering game-over flash immediately.
          clearFlashTimeout();
          setFlashInfo(null);
          setUiState('active');
          setSecondsLeft(20);
        },
        onCountdownTick: setSecondsLeft,
        onGameOver: (finalScore, reason) => {
          // Engine has already wiped the board and reset itself to idle internally.
          // We just briefly flash the result in the HUD, then it fades back to the
          // normal idle prompt -- no button, no interruption.
          if (reason === 'bomb') triggerBombFx();
          setUiState('idle');
          setFlashInfo({ score: finalScore, reason });
          setHighScore((prev) => {
            if (finalScore <= prev) return prev;
            try { localStorage.setItem(HIGH_SCORE_KEY, String(finalScore)); } catch {}
            return finalScore;
          });
          clearFlashTimeout();
          flashTimeoutRef.current = window.setTimeout(() => setFlashInfo(null), FLASH_DURATION_MS);
        },
      });
      engineRef.current = engine;
      engine.start();
      engine.setExclusionZones(computeExclusionRects());
    })();

    return () => {
      cancelled = true;
      clearFlashTimeout();
      if (shakeTimeoutRef.current !== null) window.clearTimeout(shakeTimeoutRef.current);
      if (bombFxTimeoutRef.current !== null) window.clearTimeout(bombFxTimeoutRef.current);
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [enabled, clearFlashTimeout, triggerBombFx]);

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
    // A slow fallback poll for DOM changes that don't fire resize/scroll (data loading,
    // tab switches). 2.5s instead of 1s -- this queries every excluded selector and reads
    // layout for each match, so halving the frequency meaningfully cuts a background cost
    // that runs on every page, forever, for a purely decorative feature.
    const interval = window.setInterval(refresh, 2500);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', refresh);
      window.removeEventListener('scroll', refresh, true);
      window.clearInterval(interval);
    };
  }, [enabled]);

  return (
    <>
      {/* Full-viewport ambient canvas -- sits behind real UI (z-1), never intercepts clicks on cards.
          A bomb hit briefly shakes just this layer, never real UI. */}
      {enabled && (
        <div
          ref={containerRef}
          data-game-ui
          className="pointer-events-auto fixed inset-0 z-[1]"
          style={{ background: 'transparent' }}
        />
      )}

      {/* Red vignette flash on bomb hit -- purely decorative, never blocks pointer events. */}
      {enabled && vignetteActive && (
        <div key={bombFxKey} aria-hidden="true" className="bomb-vignette pointer-events-none fixed inset-0 z-[3]" />
      )}

      {/* Floating score / status - subtle, bottom-right. Doubles as the Game Over
          flash: briefly shows the final score + cause, then eases back to normal. */}
      <AnimatePresence>
        {enabled && (
          <motion.div
            data-game-ui
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="pointer-events-none fixed bottom-4 right-4 z-[2] rounded-2xl bg-black/30 px-3 py-1.5 text-right backdrop-blur-sm"
          >
            <div key={flashInfo ? 'flash' : uiState}>
              {flashInfo ? (
                <>
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">
                    {flashInfo.reason === 'bomb' ? '💥 Bomb!' : '⏱ Time out'}
                  </span>
                  <span className="ml-1.5 text-sm font-black tabular-nums text-white/90">{flashInfo.score}</span>
                </>
              ) : uiState === 'idle' ? (
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                  Slice a mushroom to start
                </span>
              ) : (
                <>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/50">Score </span>
                  <span className="text-sm font-black tabular-nums text-white/90">{score}</span>
                  {combo > 0 && <span className="ml-1.5 text-[10px] font-black text-amber-300">x{multiplier}</span>}
                  <span className={`ml-2 text-[10px] font-bold tabular-nums ${secondsLeft <= 5 ? 'text-rose-400' : 'text-white/40'}`}>
                    {'⏱'} {secondsLeft}s
                  </span>
                </>
              )}
            </div>
            {highScore > 0 && (
              <div className="mt-0.5 text-[8px] font-semibold uppercase tracking-widest text-white/30">Best {highScore}</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Extends every page's scrollable height so there's always open, card-free
          space at the bottom to slice in freely. */}
      <div aria-hidden="true" style={{ height: '90vh' }} />
    </>
  );
}
