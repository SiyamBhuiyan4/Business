'use client';

import React, { useRef, useState } from 'react';

export default function SpotlightCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  return (
    <div ref={ref} onMouseMove={(event) => { const rect = ref.current?.getBoundingClientRect(); if (rect) setPosition({ x: event.clientX - rect.left, y: event.clientY - rect.top }); }} onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)} className={`spotlight-card ${className}`}>
      <div aria-hidden="true" className="spotlight-fill" style={{ opacity: visible ? 1 : 0, background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, rgba(200,138,88,.16), transparent 78%)` }} />
      <div aria-hidden="true" className="spotlight-edge" style={{ opacity: visible ? 1 : 0, background: `radial-gradient(200px circle at ${position.x}px ${position.y}px, rgba(200,138,88,.42), transparent 70%)` }} />
      <div className="relative z-[1] h-full">{children}</div>
    </div>
  );
}
