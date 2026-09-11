'use client';

import React from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';

export default function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const rotateX = useSpring(useMotionValue(0), { stiffness: 300, damping: 25 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 300, damping: 25 });
  const shadowX = useSpring(useMotionValue(0), { stiffness: 300, damping: 25 });
  const shadowY = useSpring(useMotionValue(0), { stiffness: 300, damping: 25 });
  const boxShadow = useMotionTemplate`${shadowX}px ${shadowY}px 25px rgba(15,23,42,.12)`;

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    const rx = -py * 24;
    const ry = px * 24;
    rotateX.set(rx);
    rotateY.set(ry);
    shadowX.set(-ry * 1.3);
    shadowY.set(rx * 1.3);
  };

  const reset = () => {
    rotateX.set(0);
    rotateY.set(0);
    shadowX.set(0);
    shadowY.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ rotateX, rotateY, boxShadow, transformPerspective: 1000 }}
      className={`tilt-card ${className}`}
    >
      <div className="tilt-card-content">{children}</div>
    </motion.div>
  );
}
