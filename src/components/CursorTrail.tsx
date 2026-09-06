'use client';

import { useEffect, useRef } from 'react';

type TrailPoint = { x: number; y: number; timestamp: number };

export default function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let points: TrailPoint[] = [];
    let frame = 0;
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const handleMove = (event: MouseEvent) => {
      points.push({ x: event.clientX, y: event.clientY, timestamp: Date.now() });
      if (points.length > 120) points = points.slice(-120);
    };
    const render = () => {
      const now = Date.now();
      points = points.filter((point) => now - point.timestamp < 1000);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let index = 0; index < points.length - 1; index += 1) {
        const point = points[index];
        const next = points[index + 1];
        const progress = Math.max(0, Math.min(1, 1 - (now - point.timestamp) / 1000));
        if (progress <= 0) continue;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(next.x, next.y);
        ctx.strokeStyle = `rgba(200, 138, 88, ${progress * 0.82})`;
        ctx.lineWidth = Math.max(0.25, progress * 6);
        ctx.shadowColor = 'rgba(200, 138, 88, 0.6)';
        ctx.shadowBlur = progress * 8;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      frame = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMove, { passive: true });
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMove);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="cursor-trail" />;
}
