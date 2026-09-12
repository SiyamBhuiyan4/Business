'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ENABLED_KEY = 'bizhub-mushroom-game-enabled';

interface MushroomGameContextValue {
  enabled: boolean;
  toggle: () => void;
}

const MushroomGameContext = createContext<MushroomGameContextValue | null>(null);

/** Owns the mushroom-slicer on/off state so both the header toggle button
 * (Navbar) and the ambient game layer (FruitNinjaGame) share one source of truth. */
export function MushroomGameProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ENABLED_KEY);
      if (saved !== null) setEnabled(saved === 'on');
    } catch {
      // localStorage unavailable -- default stays as-is
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try { localStorage.setItem(ENABLED_KEY, next ? 'on' : 'off'); } catch {}
      return next;
    });
  }, []);

  return <MushroomGameContext.Provider value={{ enabled, toggle }}>{children}</MushroomGameContext.Provider>;
}

export function useMushroomGame(): MushroomGameContextValue {
  const ctx = useContext(MushroomGameContext);
  if (!ctx) throw new Error('useMushroomGame must be used within a MushroomGameProvider');
  return ctx;
}
