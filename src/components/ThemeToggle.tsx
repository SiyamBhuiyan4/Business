'use client';
import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { const saved = localStorage.getItem('rise-theme'); const enabled = saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; document.documentElement.classList.toggle('dark', enabled); setDark(enabled); }, []);
  const toggle = () => { const enabled = !dark; document.documentElement.classList.toggle('dark', enabled); localStorage.setItem('rise-theme', enabled ? 'dark' : 'light'); setDark(enabled); };
  return <button type="button" onClick={toggle} title={dark ? 'Use light theme' : 'Use dark theme'} aria-label={dark ? 'Use light theme' : 'Use dark theme'} className="theme-toggle">{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>;
}
