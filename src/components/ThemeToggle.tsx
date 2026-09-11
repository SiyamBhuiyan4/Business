'use client';
import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { springSnappy } from '@/lib/motion';

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { const saved = localStorage.getItem('rise-theme'); const enabled = saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; document.documentElement.classList.toggle('dark', enabled); setDark(enabled); }, []);
  const toggle = () => { const enabled = !dark; document.documentElement.classList.toggle('dark', enabled); localStorage.setItem('rise-theme', enabled ? 'dark' : 'light'); setDark(enabled); };
  return (
    <motion.button
      type="button"
      onClick={toggle}
      title={dark ? 'Use light theme' : 'Use dark theme'}
      aria-label={dark ? 'Use light theme' : 'Use dark theme'}
      className="theme-toggle overflow-hidden"
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.06 }}
      transition={springSnappy}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={dark ? 'sun' : 'moon'}
          className="flex items-center justify-center"
          initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
          transition={springSnappy}
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
