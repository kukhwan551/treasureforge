"use client";

// app/play/[shareCode]/components/ConfettiCanvas.tsx
// Canvas 기반 폭죽/꽃가루 파티클 애니메이션

import { useEffect, useRef } from "react";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  size: number;
  rotation: number;
  rotSpeed: number;
  shape: "rect" | "circle" | "star";
  life: number;
  maxLife: number;
}

const COLORS = [
  "#b89a5a", "#4a9d6f", "#e07070", "#7a9aba",
  "#d4a0e0", "#f0c040", "#80d080", "#f08060",
];

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function createParticle(
  x: number, y: number,
  angle: number, speed: number
): Particle {
  const rad = (angle * Math.PI) / 180;
  return {
    x, y,
    vx: Math.cos(rad) * speed * (0.5 + Math.random() * 0.5),
    vy: Math.sin(rad) * speed * (0.5 + Math.random() * 0.5),
    color: randomColor(),
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 15,
    shape: ["rect", "circle", "star"][Math.floor(Math.random() * 3)] as Particle["shape"],
    life: 0,
    maxLife: 80 + Math.random() * 60,
  };
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number
) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const b = (i * 4 * Math.PI) / 5 + (2 * Math.PI) / 5 - Math.PI / 2;
    if (i === 0) ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a));
    else ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
    ctx.lineTo(x + (r * 0.4) * Math.cos(b), y + (r * 0.4) * Math.sin(b));
  }
  ctx.closePath();
  ctx.fill();
}

interface ConfettiCanvasProps {
  active: boolean;
  originX?: number; // 0~100% (기본: 화면 중앙)
  originY?: number;
}

export default function ConfettiCanvas({
  active, originX = 50, originY = 50,
}: ConfettiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const rafRef    = useRef<number | null>(null);
  const burstDone = useRef(false);

  useEffect(() => {
    if (!active) {
      burstDone.current = false;
      particles.current = [];
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const ox = (originX / 100) * canvas.width;
    const oy = (originY / 100) * canvas.height;

    // 폭죽 버스트 — 여러 방향으로 파티클 생성
    const burst = () => {
      for (let i = 0; i < 120; i++) {
        const angle = (i / 120) * 360 + (Math.random() - 0.5) * 30;
        const speed = 8 + Math.random() * 12;
        particles.current.push(createParticle(ox, oy, angle, speed));
      }
      // 2차 버스트 (약간 딜레이)
      setTimeout(() => {
        for (let i = 0; i < 60; i++) {
          const angle = Math.random() * 360;
          const speed = 4 + Math.random() * 8;
          const sx = ox + (Math.random() - 0.5) * 200;
          const sy = oy + (Math.random() - 0.5) * 100;
          particles.current.push(createParticle(sx, sy, angle, speed));
        }
      }, 200);
    };

    burst();
    burstDone.current = true;

    const ctx = canvas.getContext("2d")!;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.current = particles.current.filter((p) => p.life < p.maxLife);

      for (const p of particles.current) {
        p.life++;
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy += 0.3; // 중력
        p.vx *= 0.99;
        p.rotation += p.rotSpeed;

        const alpha = 1 - p.life / p.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          drawStar(ctx, 0, 0, p.size / 2);
        }

        ctx.restore();
      }

      if (particles.current.length > 0) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, originX, originY]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 100 }}
    />
  );
}
