'use client';

import React, { useEffect, useRef } from 'react';

export default function BlueprintAmbient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let frame = 0;
    let width = 0;
    let height = 0;
    const nodes = Array.from({ length: 24 }, (_, index) => ({
      angle: (Math.PI * 2 * index) / 24,
      radius: 0.22 + (index % 5) * 0.055,
      speed: 0.00008 + (index % 4) * 0.000018,
      depth: 0.55 + (index % 3) * 0.18,
    }));

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      const centerX = width * 0.82;
      const centerY = Math.min(height * 0.32, 300);
      const scale = Math.min(width, height) * 0.42;
      const points = nodes.map((node) => {
        const angle = node.angle + time * node.speed;
        return {
          x: centerX + Math.cos(angle) * scale * node.radius,
          y: centerY + Math.sin(angle) * scale * node.radius * node.depth,
        };
      });

      context.lineWidth = 0.7;
      points.forEach((point, index) => {
        points.slice(index + 1).forEach((other) => {
          const distance = Math.hypot(point.x - other.x, point.y - other.y);
          if (distance < 115) {
            context.strokeStyle = `rgba(26, 83, 92, ${0.12 * (1 - distance / 115)})`;
            context.beginPath();
            context.moveTo(point.x, point.y);
            context.lineTo(other.x, other.y);
            context.stroke();
          }
        });
        const pulse = 1.8 + Math.sin(time * 0.002 + index) * 0.7;
        context.fillStyle = index % 4 === 0 ? 'rgba(200, 138, 88, .42)' : 'rgba(26, 83, 92, .34)';
        context.beginPath();
        context.arc(point.x, point.y, pulse, 0, Math.PI * 2);
        context.fill();
      });
      frame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) frame = requestAnimationFrame(draw);
    else draw(0);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="blueprint-ambient" />;
}
