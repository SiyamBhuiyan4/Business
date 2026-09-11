'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { dropdownPop } from '@/lib/motion';

export interface ContextMenuItem {
  key: string;
  label: React.ReactNode;
  icon?: React.ElementType;
  onSelect: () => void;
  danger?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  children: React.ReactNode;
  className?: string;
}

export default function ContextMenu({ items, children, className = '' }: ContextMenuProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', (e) => e.key === 'Escape' && close());
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [pos]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setPos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div onContextMenu={handleContextMenu} className={className}>
      {children}
      <AnimatePresence>
        {pos && (
          <motion.div
            ref={menuRef}
            className="fixed z-[1000] min-w-[160px] overflow-hidden rounded-xl border border-slate-700 bg-slate-900/95 py-1.5 shadow-2xl backdrop-blur-xl"
            style={{ left: pos.x, top: pos.y }}
            variants={dropdownPop}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((item) => (
              <button
                key={item.key}
                onClick={() => { item.onSelect(); setPos(null); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold transition-colors ${
                  item.danger ? 'text-rose-400 hover:bg-rose-500/10' : 'text-slate-200 hover:bg-slate-800'
                }`}
              >
                {item.icon && <item.icon className="h-3.5 w-3.5" />}
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
