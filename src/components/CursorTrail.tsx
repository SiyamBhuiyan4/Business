'use client';

import { useEffect, useRef } from 'react';

type TrailPoint = { x: number; y: number };

export default function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const TRAIL_LENGTH = 22;
    const mouse = { x: -100, y: -100 };
    const pos = { x: -100, y: -100 };
    let points: TrailPoint[] = [];
    let orbitAngle = 0;
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
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      if (pos.x === -100) { pos.x = mouse.x; pos.y = mouse.y; }
    };
    const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;
    const render = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      if (mouse.x >= 0 && mouse.y >= 0) {
        pos.x = lerp(pos.x, mouse.x, 0.25);
        pos.y = lerp(pos.y, mouse.y, 0.25);
        points.push({ x: pos.x, y: pos.y });
        if (points.length > TRAIL_LENGTH) points.shift();

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let index = 0; index < points.length - 1; index += 1) {
          const point = points[index];
          const next = points[index + 1];
          const ratio = (index + 1) / points.length;
          ctx.beginPath();
          ctx.moveTo(point.x, point.y);
          ctx.lineTo(next.x, next.y);
          ctx.strokeStyle = `rgba(200, 138, 88, ${ratio * 0.82})`;
          ctx.lineWidth = Math.max(0.3, ratio * 5);
          ctx.shadowColor = 'rgba(200, 138, 88, 0.6)';
          ctx.shadowBlur = ratio * 8;
          ctx.stroke();
        }

        orbitAngle += 0.09;
        const orbitX = pos.x + 13 * Math.cos(orbitAngle);
        const orbitY = pos.y + 13 * Math.sin(orbitAngle);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#0D9488';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(orbitX, orbitY, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#D97706';
        ctx.shadowColor = '#D97706';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
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
