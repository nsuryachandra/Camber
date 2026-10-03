import { useEffect, useRef } from 'react';

export default function ConfettiPopperCanvas({ active }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = (canvas.width = canvas.offsetWidth || 500);
    const height = (canvas.height = canvas.offsetHeight || 400);

    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#ffffff'];
    const particles = [];

    // Party popper blasts vigorously from left and right lower corners
    for (let i = 0; i < 110; i++) {
      const fromLeft = i % 2 === 0;
      particles.push({
        x: fromLeft ? 20 : width - 20,
        y: height - 20,
        vx: fromLeft ? Math.random() * 14 + 5 : -(Math.random() * 14 + 5),
        vy: -(Math.random() * 18 + 12),
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 16,
        opacity: 1,
        gravity: 0.42,
      });
    }

    let animId;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += p.rotSpeed;
        p.opacity -= 0.011;

        if (p.opacity > 0) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
          ctx.restore();
        }
      }
      if (alive) {
        animId = requestAnimationFrame(render);
      }
    };
    render();

    return () => cancelAnimationFrame(animId);
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}
