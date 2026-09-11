'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { FruitSliceEngine } from './fruitGameEngine';

/**
 * Always-on mini-game embedded at the bottom of every page (in normal document
 * flow, not a full-screen overlay) -- scroll to the end of any page to find it.
 * No activation gesture: it mounts and starts playing automatically.
 */
export default function FruitNinjaGame() {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [multiplier, setMultiplier] = useState(1);
  const [combo, setCombo] = useState(0);
  const [gameOver, setGameOver] = useState<number | null>(null);
  const [restartKey, setRestartKey] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<FruitSliceEngine | null>(null);

  const restartGame = useCallback(() => {
    setGameOver(null);
    setScore(0);
    setLives(3);
    setMultiplier(1);
    setCombo(0);
    setRestartKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
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
  }, [restartKey]);

  return (
    <div className="px-4 pb-10 pt-2 lg:px-8">
    <section
      className="relative mx-auto h-[420px] w-full max-w-7xl overflow-hidden rounded-3xl border border-white/10 shadow-2xl sm:h-[520px]"
      style={{ background: 'linear-gradient(160deg, #2a1d13, #120d09)' }}
    >
      <div ref={containerRef} className="absolute inset-0" />

      {/* Title + lives - top left */}
      <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-wrap items-center gap-3">
        <span className="rounded-2xl bg-black/40 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-amber-300 backdrop-blur-sm">
          {'\u{1F344}'} Mushroom Master
        </span>
        <span className="flex items-center gap-2 rounded-2xl bg-black/40 px-3 py-1.5 backdrop-blur-sm">
          <span className="text-lg">{'\u{1F344}'.repeat(Math.max(0, lives))}</span>
          <span className="text-xs font-bold text-white/70">x{Math.max(0, lives)}</span>
        </span>
      </div>

      {/* Multiplier - center */}
      <AnimatePresence>
        {gameOver === null && (
          <motion.div
            key={combo > 0 ? 'active' : 'idle'}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: combo > 0 ? 1 : 0.5, scale: 1 }}
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
          >
            {combo === 0 ? (
              <p className="text-base font-black uppercase tracking-widest text-white/60 drop-shadow sm:text-lg">
                Slice for fun!
              </p>
            ) : (
              <motion.p
                key={multiplier}
                initial={{ scale: 1.4 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="text-3xl font-black text-amber-300 drop-shadow-[0_0_18px_rgba(252,211,77,.6)] sm:text-5xl"
              >
                x{multiplier} <span className="text-lg align-top sm:text-2xl">MULTIPLIER</span>
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Score - bottom right */}
      <div className="pointer-events-none absolute bottom-5 right-5 z-10 text-right">
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">Score</div>
        <div className="text-4xl font-black tabular-nums text-white drop-shadow-[0_0_20px_rgba(255,255,255,.3)] sm:text-6xl">
          {score}
        </div>
      </div>

      {/* Game Over -- only covers this section, not the whole page */}
      <AnimatePresence>
        {gameOver !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/75"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="w-full max-w-xs rounded-3xl border border-white/10 bg-slate-900 p-6 text-center shadow-2xl sm:max-w-sm sm:p-8"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-amber-400">Game Over</p>
              <p className="mt-2 text-4xl font-black text-white sm:text-5xl">{gameOver}</p>
              <p className="mt-1 text-xs text-slate-400">points sliced</p>
              <button
                onClick={restartGame}
                className="mt-6 w-full rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-300"
              >
                Play Again
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
    </div>
  );
}
