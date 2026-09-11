'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { FruitSliceEngine } from './fruitGameEngine';

const PULL_THRESHOLD = 70;
const TRIGGER_ZONE_HEIGHT = 26;

export default function FruitNinjaGame() {
  const [active, setActive] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [multiplier, setMultiplier] = useState(1);
  const [combo, setCombo] = useState(0);
  const [gameOver, setGameOver] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<FruitSliceEngine | null>(null);
  const startYRef = useRef<number | null>(null);

  const closeGame = useCallback(() => {
    engineRef.current?.destroy();
    engineRef.current = null;
    setActive(false);
    setGameOver(null);
  }, []);

  const restartGame = useCallback(() => {
    setGameOver(null);
    setScore(0);
    setLives(3);
    setMultiplier(1);
    setCombo(0);
    engineRef.current?.destroy();
    engineRef.current = null;
    // Re-trigger the mount effect by toggling active off/on in the same tick via a microtask
    setActive(false);
    requestAnimationFrame(() => setActive(true));
  }, []);

  // Bottom-edge "pull up to play" gesture trigger. Purely observational (passive
  // window listeners, no blocking overlay element) so it never intercepts real
  // clicks/taps on page content -- it only watches where gestures start and end.
  useEffect(() => {
    if (active) return;

    const onPointerDown = (e: PointerEvent) => {
      if (e.clientY > window.innerHeight - TRIGGER_ZONE_HEIGHT) {
        startYRef.current = e.clientY;
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (startYRef.current == null) return;
      if (startYRef.current - e.clientY > PULL_THRESHOLD) {
        startYRef.current = null;
        setActive(true);
      }
    };
    const onPointerUp = () => {
      startYRef.current = null;
    };

    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [active]);

  // Escape key closes an active game
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeGame();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, closeGame]);

  // Mount/unmount the Pixi engine when the game becomes active
  useEffect(() => {
    if (!active || !containerRef.current) return;
    let cancelled = false;

    (async () => {
      const [PIXI, { FruitSliceEngine: Engine }] = await Promise.all([
        import('pixi.js'),
        import('./fruitGameEngine'),
      ]);
      if (cancelled || !containerRef.current) return;

      const engine = new Engine(containerRef.current, PIXI, {
        onScoreChange: setScore,
        onLivesChange: setLives,
        onMultiplierChange: (m, c) => { setMultiplier(m); setCombo(c); },
        onGameOver: (finalScore) => setGameOver(finalScore),
      });
      engineRef.current = engine;
      engine.start();
    })();

    return () => {
      cancelled = true;
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [active]);

  return (
    <>
      <AnimatePresence>
        {active && (
          <motion.div
            className="fixed inset-0 z-[9998]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="absolute inset-0 bg-black/55 backdrop-blur-md" />
            <div ref={containerRef} className="absolute inset-0" />

            {/* Lives - top left */}
            <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-2xl bg-black/40 px-4 py-2 backdrop-blur-sm">
              <span className="text-2xl">{'\u{1F352}'.repeat(Math.max(0, lives))}</span>
              <span className="text-sm font-bold text-white/70">x{Math.max(0, lives)}</span>
            </div>

            {/* Close button */}
            <button
              onClick={closeGame}
              className="absolute right-4 top-4 rounded-xl bg-black/40 p-2 text-white/80 backdrop-blur-sm hover:bg-black/60 hover:text-white"
              title="Close game (Esc)"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Multiplier - center */}
            <AnimatePresence>
              {gameOver === null && (
                <motion.div
                  key={combo > 0 ? 'active' : 'idle'}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: combo > 0 ? 1 : 0.55, scale: 1 }}
                  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
                >
                  {combo === 0 ? (
                    <p className="text-lg font-black uppercase tracking-widest text-white/70 drop-shadow">
                      Slice to activate!
                    </p>
                  ) : (
                    <motion.p
                      key={multiplier}
                      initial={{ scale: 1.4 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      className="text-5xl font-black text-amber-300 drop-shadow-[0_0_18px_rgba(252,211,77,.6)]"
                    >
                      x{multiplier} <span className="text-2xl align-top">MULTIPLIER</span>
                    </motion.p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Score - bottom right */}
            <div className="pointer-events-none absolute bottom-6 right-6 text-right">
              <div className="text-xs font-bold uppercase tracking-widest text-white/50">Score</div>
              <div className="text-6xl font-black tabular-nums text-white drop-shadow-[0_0_20px_rgba(255,255,255,.35)]">
                {score}
              </div>
            </div>

            {/* Game Over */}
            <AnimatePresence>
              {gameOver !== null && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex items-center justify-center bg-black/70"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                    className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900 p-8 text-center shadow-2xl"
                  >
                    <p className="text-xs font-bold uppercase tracking-widest text-amber-400">Game Over</p>
                    <p className="mt-2 text-5xl font-black text-white">{gameOver}</p>
                    <p className="mt-1 text-xs text-slate-400">points sliced</p>
                    <div className="mt-6 flex items-center justify-center gap-3">
                      <button onClick={closeGame} className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-slate-700">
                        Close
                      </button>
                      <button onClick={restartGame} className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-300">
                        Play Again
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
