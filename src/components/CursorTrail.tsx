'use client';

import { useEffect, useRef } from 'react';

type TrailPoint = { x: number; y: number };

const ORBIT_RADIUS = 13;
const ORBIT_SPEED = 0.09;
const TRAIL_LENGTH = 22;

export default function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const mouse = { x: -100, y: -100 };
    const points: TrailPoint[] = [];
    let angle = 0;
    let frame = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    // Passive listener just records the latest raw pointer position -- no React state,
    // no re-renders. All motion (orbit angle, trail, drawing) is driven entirely by the
    // rAF loop below, decoupled from how often mousemove actually fires.
    const handleMove = (event: MouseEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (mouse.x >= 0 && mouse.y >= 0) {
        // Continuously orbit the dot around the actual cursor position -- the angle keeps
        // advancing every frame regardless of whether the mouse is moving, so the dot
        // keeps circling even while the cursor sits still.
        angle += ORBIT_SPEED;
        const dotX = mouse.x + ORBIT_RADIUS * Math.cos(angle);
        const dotY = mouse.y + ORBIT_RADIUS * Math.sin(angle);

        points.push({ x: dotX, y: dotY });
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

        ctx.beginPath();
        ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#0D9488';
        ctx.shadowColor = '#0D9488';
        ctx.shadowBlur = 6;
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
