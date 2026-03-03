import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';

/* ─── TPHub Design System Colors ─── */
const P300 = '#6bb8e0';
const P400 = '#3a9fd4';
const P600 = '#095789';
const BG = '#f3f7f9';

/* ─── Aurora Waves Canvas ─── */
function AuroraWaves({ width, height }: { width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let t = 0;

    const waves = [
      // ── Blues first (background layer) ──
      { r: 9, g: 87, b: 137, alpha: 0.45, speed: 0.007, amp: 65, freq: 0.003, yOff: 0.42 },
      { r: 11, g: 123, b: 184, alpha: 0.35, speed: 0.005, amp: 50, freq: 0.004, yOff: 0.48 },
      { r: 58, g: 159, b: 212, alpha: 0.3, speed: 0.0085, amp: 45, freq: 0.0035, yOff: 0.54 },
      { r: 107, g: 184, b: 224, alpha: 0.25, speed: 0.0065, amp: 35, freq: 0.005, yOff: 0.58 },
      { r: 7, g: 69, b: 103, alpha: 0.35, speed: 0.004, amp: 55, freq: 0.002, yOff: 0.63 },
      // ── Oranges on top (foreground layer) ──
      { r: 255, g: 161, b: 102, alpha: 0.4, speed: 0.008, amp: 55, freq: 0.0028, yOff: 0.68 },
      { r: 255, g: 133, b: 51, alpha: 0.35, speed: 0.009, amp: 50, freq: 0.003, yOff: 0.73 },
      { r: 255, g: 180, b: 120, alpha: 0.3, speed: 0.006, amp: 45, freq: 0.0032, yOff: 0.78 },
      { r: 255, g: 145, b: 70, alpha: 0.3, speed: 0.0055, amp: 50, freq: 0.0022, yOff: 0.83 },
    ];

    function draw() {
      ctx!.fillStyle = BG;
      ctx!.fillRect(0, 0, width, height);
      t += 1;

      waves.forEach((w) => {
        ctx!.beginPath();
        ctx!.moveTo(0, height);
        for (let x = 0; x <= width; x += 2) {
          const y =
            w.yOff * height +
            Math.sin(x * w.freq + t * w.speed) * w.amp +
            Math.sin(x * w.freq * 0.5 + t * w.speed * 1.3) * w.amp * 0.5 +
            Math.cos(x * w.freq * 0.3 + t * w.speed * 0.7) * w.amp * 0.3;
          ctx!.lineTo(x, y);
        }
        ctx!.lineTo(width, height);
        ctx!.closePath();
        ctx!.fillStyle = `rgba(${w.r}, ${w.g}, ${w.b}, ${w.alpha})`;
        ctx!.fill();
      });

      const orbs = [
        { x: 0.12 + Math.sin(t * 0.003) * 0.06, y: 0.5 + Math.cos(t * 0.002) * 0.04, rad: 240, c: 'rgba(9,87,137,0.15)' },
        { x: 0.82 + Math.cos(t * 0.0025) * 0.05, y: 0.6 + Math.sin(t * 0.003) * 0.05, rad: 260, c: 'rgba(255,161,102,0.2)' },
        { x: 0.48 + Math.sin(t * 0.002) * 0.04, y: 0.55 + Math.cos(t * 0.0035) * 0.03, rad: 190, c: 'rgba(11,123,184,0.12)' },
        { x: 0.3 + Math.cos(t * 0.0018) * 0.05, y: 0.68 + Math.sin(t * 0.0025) * 0.04, rad: 220, c: 'rgba(255,133,51,0.18)' },
        { x: 0.7 + Math.cos(t * 0.0015) * 0.05, y: 0.52 + Math.sin(t * 0.002) * 0.04, rad: 160, c: 'rgba(58,159,212,0.1)' },
        { x: 0.6 + Math.sin(t * 0.002) * 0.04, y: 0.75 + Math.cos(t * 0.003) * 0.03, rad: 200, c: 'rgba(255,180,120,0.15)' },
      ];
      orbs.forEach((o) => {
        const ox = o.x * width;
        const oy = o.y * height;
        const grad = ctx!.createRadialGradient(ox, oy, 0, ox, oy, o.rad);
        grad.addColorStop(0, o.c);
        grad.addColorStop(1, 'transparent');
        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.arc(ox, oy, o.rad, 0, Math.PI * 2);
        ctx!.fill();
      });

      animRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
}

/**
 * AuthLayout - Layout component for authentication pages
 *
 * Features:
 * - Aurora Waves animated canvas background
 * - Glassmorphism content area
 * - ThinkPaladar branding
 * - Responsive centered content
 */
export function AuthLayout() {
  const [dims, setDims] = useState({ w: 900, h: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        setDims({ w: r.width, h: r.height });
      }
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{
        height: '100vh',
        minHeight: 600,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <AuroraWaves width={dims.w} height={dims.h} />

      {/* Subtle noise texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.02,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: '128px 128px',
        }}
      />

      {/* Content overlay */}
      <div className="absolute inset-0 flex items-center justify-center p-6 z-10">
        <Outlet />
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-6 py-3.5 px-6 z-10">
        {['Privacidad', 'Términos', 'Soporte'].map((label) => (
          <a
            key={label}
            href="#"
            className="text-[11px] font-[450] transition-colors duration-150"
            style={{ color: P400 }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = P600)}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = P400)}
          >
            {label}
          </a>
        ))}
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        input::placeholder { color: ${P300}; }
      `}</style>
    </div>
  );
}
