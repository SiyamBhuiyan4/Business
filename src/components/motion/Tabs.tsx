'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { springGentle } from '@/lib/motion';

export interface TabItem {
  key: string;
  label: React.ReactNode;
  icon?: React.ElementType;
}

interface TabsProps {
  items: TabItem[];
  active: string;
  onChange: (key: string) => void;
  layoutId?: string;
  className?: string;
  tabClassName?: string;
  activeTextClassName?: string;
  inactiveTextClassName?: string;
}

export default function Tabs({
  items,
  active,
  onChange,
  layoutId = 'tab-pill',
  className = '',
  tabClassName = '',
  activeTextClassName = 'text-white',
  inactiveTextClassName = 'text-slate-500',
}: TabsProps) {
  return (
    <div className={`relative flex items-center gap-1 ${className}`}>
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={`relative z-10 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${tabClassName} ${isActive ? activeTextClassName : inactiveTextClassName}`}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 -z-10 rounded-xl bg-[#1A535C]"
                transition={springGentle}
              />
            )}
            {item.icon && <item.icon className="h-3.5 w-3.5" />}
            <span className="relative">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
