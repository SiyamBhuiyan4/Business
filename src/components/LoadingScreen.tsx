'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Store } from 'lucide-react';

export default function LoadingScreen() {
  const [visible, setVisible] = useState(true);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(false);
      return;
    }
    const duration = 1200;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setPct(Math.round(t * 100));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        window.setTimeout(() => setVisible(false), 250);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5"
          style={{ background: 'linear-gradient(145deg, var(--canvas), var(--canvas-deep))' }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          <div className="relative h-20 w-20">
            <Store className="absolute inset-0 h-20 w-20 text-[color:var(--muted)] opacity-25" strokeWidth={1.3} />
            <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(${100 - pct}% 0 0 0)` }}>
              <Store className="h-20 w-20 text-[#1A535C]" strokeWidth={1.3} />
            </div>
          </div>
          <div className="font-display text-4xl font-black tabular-nums text-[#1A535C]">
            {pct}
            <span className="align-top text-lg">%</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
