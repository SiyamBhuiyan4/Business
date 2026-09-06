'use client';

import React, { useRef } from 'react';

export default function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number>();
  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const card = ref.current; if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - .5;
    const y = (event.clientY - rect.top) / rect.height - .5;
    cancelAnimationFrame(frame.current || 0);
    frame.current = requestAnimationFrame(() => {
      const rotateX = -y * 24; const rotateY = x * 24;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      card.style.boxShadow = `${-rotateY * 1.3}px ${rotateX * 1.3}px 25px rgba(15,23,42,.12)`;
    });
  };
  const reset = () => { const card = ref.current; if (!card) return; card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)'; card.style.boxShadow = ''; };
  return <div ref={ref} onMouseMove={handleMove} onMouseLeave={reset} className={`tilt-card ${className}`}><div className="tilt-card-content">{children}</div></div>;
}
