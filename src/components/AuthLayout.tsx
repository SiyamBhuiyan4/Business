'use client';

import React from 'react';
import { motion, type AnimationControls } from 'framer-motion';
import { fadeScaleIn } from '@/lib/motion';
import AmbientBrandGraphic from '@/components/AmbientBrandGraphic';

interface AuthLayoutProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  accent?: 'teal' | 'copper';
  shakeControls?: AnimationControls;
  onSubmit?: (e: React.FormEvent) => void;
  children: React.ReactNode;
  footerSlot?: React.ReactNode;
  as?: 'form' | 'div';
}

export default function AuthLayout({
  eyebrow,
  title,
  subtitle,
  accent = 'teal',
  shakeControls,
  onSubmit,
  children,
  footerSlot,
  as = 'form',
}: AuthLayoutProps) {
  const accentVar = accent === 'copper' ? 'var(--copper)' : 'var(--teal)';
  const Wrapper = as === 'form' ? motion.form : motion.div;

  return (
    <main
      className="relative min-h-screen overflow-hidden flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(145deg, var(--canvas), var(--canvas-deep))' }}
    >
      <AmbientBrandGraphic className="-right-24 -top-24" />
      <AmbientBrandGraphic className="-bottom-32 -left-20 rotate-180" />
      <Wrapper
        {...(as === 'form' ? { onSubmit } : {})}
        initial="hidden"
        animate={shakeControls ?? 'visible'}
        variants={fadeScaleIn}
        className="glass-panel relative z-10 w-full max-w-md space-y-5 rounded-3xl p-8"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accentVar }}>
            {eyebrow}
          </p>
          <h1 className="mt-2 text-2xl font-black" style={{ color: 'var(--ink)' }}>
            {title}
          </h1>
          <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
            {subtitle}
          </p>
        </div>
        {children}
        {footerSlot}
      </Wrapper>
    </main>
  );
}
