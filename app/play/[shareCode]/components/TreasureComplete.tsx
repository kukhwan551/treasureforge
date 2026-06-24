"use client";

// app/play/[shareCode]/components/TreasureComplete.tsx
import { useEffect, useState, useRef } from "react";
import type { PublicGame, PlayerSession } from "@/types/explore";
import { playTreasureSound } from "@/lib/signalEngine";

interface TreasureCompleteProps {
  game: PublicGame;
  session: PlayerSession;
  seniorMode: boolean;
  soundEnabled: boolean;
  alreadyClaimed?: boolean;
  onRestart: () => void;
  onExit: () => void;
}

export default function TreasureComplete({
  game, session, seniorMode, soundEnabled,
  alreadyClaimed = false,
  onRestart, onExit,
}: TreasureCompleteProps) {
  const [phase, setPhase] = useState<"key" | "insert" | "open" | "reward">("key");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef(0);
  const rafRef    = useRef<number>(0);
  const phaseRef  = useRef(phase);
  phaseRef.current = phase;

  const ts   = seniorMode ? "text-xl"  : "text-base";
  const th   = seniorMode ? "text-3xl" : "text-2xl";
  const btnH = seniorMode ? "py-5"     : "py-3";

  useEffect(() => {
    if (soundEnabled) playTreasureSound();
    const t1 = setTimeout(() => setPhase("insert"), 1200);
    const t2 = setTimeout(() => setPhase("open"),   2600);
    const t3 = setTimeout(() => setPhase("reward"), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []); // eslint-disable-line

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    const W = 320;
    const H = 260;
    cvs.width  = W;
    cvs.height = H;

    function drawChest(ctx2: CanvasRenderingContext2D, openAmt: number) {
      const cx = W / 2;
      const cy = H / 2 + 20;

      // 몸통
      ctx2.fillStyle = "#7c4a1a";
      ctx2.beginPath();
      ctx2.roundRect(cx - 70, cy - 30, 140, 80, 8);
      ctx2.fill();
      ctx2.strokeStyle = "#b87a3a";
      ctx2.lineWidth = 3;
      ctx2.stroke();

      // 띠
      ctx2.fillStyle = "#b87a3a";
      ctx2.fillRect(cx - 70, cy + 10, 140, 8);

      // 자물쇠 구멍
      ctx2.fillStyle = "#5a3510";
      ctx2.beginPath();
      ctx2.arc(cx, cy + 14, 8, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.fillRect(cx - 5, cy + 14, 10, 10);

      // 뚜껑
      ctx2.save();
      ctx2.translate(cx, cy - 30);
      ctx2.rotate(-openAmt * Math.PI * 0.7);
      ctx2.fillStyle = "#9c5a22";
      ctx2.beginPath();
      ctx2.roundRect(-70, -35, 140, 38, [8, 8, 0, 0]);
      ctx2.fill();
      ctx2.strokeStyle = "#c89a5a";
      ctx2.lineWidth = 3;
      ctx2.stroke();
      ctx2.fillStyle = "#c89a5a";
      ctx2.fillRect(-70, -5, 140, 6);
      ctx2.restore();

      // 빛/보물
      if (openAmt > 0.5) {
        const alpha = (openAmt - 0.5) * 0.9;
        const glow = ctx2.createRadialGradient(cx, cy - 10, 0, cx, cy - 10, 60 * openAmt);
        glow.addColorStop(0, `rgba(255,220,80,${alpha})`);
        glow.addColorStop(1, "rgba(255,220,80,0)");
        ctx2.fillStyle = glow;
        ctx2.fillRect(cx - 80, cy - 80, 160, 100);

        if (openAmt > 0.7) {
          const items = ["💎", "💰", "✨", "🪙", "⭐"];
          const dist = 50 * (openAmt - 0.7) / 0.3;
          items.forEach((item, i) => {
            const angle = (i / items.length) * Math.PI * 2;
            const ix = cx + Math.cos(angle) * dist;
            const iy = cy - 20 - Math.sin(angle) * dist * 0.5;
            ctx2.font = `${16 + (openAmt - 0.7) * 20}px serif`;
            ctx2.textAlign = "center";
            ctx2.fillText(item, ix, iy);
          });
        }
      }
    }

    function drawKey(ctx2: CanvasRenderingContext2D, progress: number, inserting: boolean, f: number) {
      const cx = W / 2;
      const cy = H / 2 + 20;
      let kx: number, ky: number, rotation: number;

      if (!inserting) {
        kx = cx + 80 - progress * 80;
        ky = 60 + progress * 40;
        rotation = progress * Math.PI * 2;
      } else {
        kx = cx;
        ky = 100 - progress * (100 - (cy + 14));
        rotation = 0;
      }

      ctx2.save();
      ctx2.translate(kx, ky);
      ctx2.rotate(rotation);

      const grad = ctx2.createLinearGradient(-20, -5, 20, 5);
      grad.addColorStop(0, "#ffd700");
      grad.addColorStop(0.5, "#ffe55c");
      grad.addColorStop(1, "#b8860b");

      ctx2.strokeStyle = grad;
      ctx2.lineWidth = 5;
      ctx2.beginPath();
      ctx2.arc(0, 0, 12, 0, Math.PI * 2);
      ctx2.stroke();
      ctx2.fillStyle = "rgba(255,215,0,0.3)";
      ctx2.fill();

      ctx2.fillStyle = "#b8860b";
      ctx2.beginPath();
      ctx2.arc(0, 0, 4, 0, Math.PI * 2);
      ctx2.fill();

      ctx2.strokeStyle = grad;
      ctx2.lineWidth = 5;
      ctx2.lineCap = "round";
      ctx2.beginPath();
      ctx2.moveTo(10, 0);
      ctx2.lineTo(40, 0);
      ctx2.stroke();

      ctx2.lineWidth = 4;
      ctx2.beginPath();
      ctx2.moveTo(25, 0); ctx2.lineTo(25, 10);
      ctx2.moveTo(33, 0); ctx2.lineTo(33, 7);
      ctx2.stroke();

      if (!inserting) {
        ctx2.fillStyle = "rgba(255,255,200,0.8)";
        [[-15, -15], [20, -10], [-5, 15]].forEach(([sx, sy]) => {
          ctx2.beginPath();
          ctx2.arc(sx!, sy!, 2 + Math.sin(f * 0.15) * 1.5, 0, Math.PI * 2);
          ctx2.fill();
        });
      }

      ctx2.restore();
    }

    function drawKeyInLock(ctx2: CanvasRenderingContext2D) {
      const cx = W / 2;
      const cy = H / 2 + 20;
      ctx2.save();
      ctx2.translate(cx, cy + 14);
      const grad2 = ctx2.createLinearGradient(-20, -5, 20, 5);
      grad2.addColorStop(0, "#ffd700");
      grad2.addColorStop(1, "#b8860b");
      ctx2.strokeStyle = grad2;
      ctx2.lineWidth = 5;
      ctx2.beginPath();
      ctx2.arc(0, 0, 12, 0, Math.PI * 2);
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.moveTo(10, 0); ctx2.lineTo(30, 0);
      ctx2.stroke();
      ctx2.restore();
    }

    function animate() {
      frameRef.current++;
      const f = frameRef.current;
      const currentPhase = phaseRef.current;

      ctx.clearRect(0, 0, W, H);

      if (currentPhase === "key") {
        const progress = Math.min(f / 60, 1);
        drawChest(ctx, 0);
        drawKey(ctx, progress, false, f);
      } else if (currentPhase === "insert") {
        const progress = Math.min(f / 50, 1);
        drawChest(ctx, 0);
        drawKey(ctx, progress, true, f);
      } else if (currentPhase === "open") {
        const progress = Math.min(f / 60, 1);
        drawChest(ctx, progress);
        drawKeyInLock(ctx);
      } else {
        cancelAnimationFrame(rafRef.current);
        return;
      }

      rafRef.current = requestAnimationFrame(animate);
    }

    frameRef.current = 0;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  const elapsed = session.finished_at && session.started_at
    ? Math.floor(
        (new Date(session.finished_at).getTime() -
         new Date(session.started_at).getTime()) / 1000
      )
    : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0f0f10] px-4">

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="absolute animate-ping"
            style={{
              left: `${(i * 37 + 13) % 100}%`,
              top:  `${(i * 53 + 7) % 100}%`,
              width:  (i % 3) + 2,
              height: (i % 3) + 2,
              borderRadius: "50%",
              background: "#b89a5a",
              animationDuration: `${(i % 3) + 1}s`,
              animationDelay: `${(i % 5) * 0.3}s`,
              opacity: 0.6,
            }}
          />
        ))}
      </div>

      {phase !== "reward" && (
        <div className="relative">
          <canvas ref={canvasRef} style={{ width: 320, height: 260 }}/>
          <p className={`text-center text-[#b89a5a] mt-2 animate-pulse ${ts}`}>
            {phase === "key"    ? "황금열쇠를 찾았습니다! 🗝"      : ""}
            {phase === "insert" ? "보물상자 자물쇠에 꽂는 중... 🔓" : ""}
            {phase === "open"   ? "보물상자가 열립니다! ✨"         : ""}
          </p>
        </div>
      )}

      {phase === "reward" && (
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4 text-center">
          <h1 className={`font-bold text-[#b89a5a] ${th}`}>🎉 보물을 발견했습니다!</h1>
          <p className={`text-[#7a756c] ${ts}`}>{session.nickname} 탐험가, 수고하셨습니다!</p>

          {alreadyClaimed ? (
            <div className="rounded-2xl border border-[#5a5650]/30 bg-[#1a1a1a] px-6 py-5 text-center">
              <p className="text-2xl mb-2">📦</p>
              <p className={`text-[#7a756c] leading-relaxed ${seniorMode ? "text-xl" : "text-base"}`}>이미 보물을 획득하셨습니다.</p>
              <p className={`text-[#5a5650] mt-1 ${seniorMode ? "text-lg" : "text-sm"}`}>중복 지급되지 않습니다.</p>
            </div>
          ) : game.reward_message ? (
            <div className="rounded-2xl border border-[#b89a5a]/30 bg-[#b89a5a]/10 px-6 py-5">
              <div className="mb-2 flex items-center justify-center gap-1.5">
                <span className="text-lg">
                  {game.reward_type === "coupon" ? "🎫" : game.reward_type === "certificate" ? "🏆" : "💌"}
                </span>
                <span className="text-[11px] font-medium tracking-wide uppercase text-[#b89a5a]">
                  {game.reward_type === "coupon" ? "쿠폰" : game.reward_type === "certificate" ? "인증서" : "메시지"}
                </span>
              </div>
              <p className={`text-[#e8e4d9] leading-relaxed whitespace-pre-wrap ${seniorMode ? "text-xl" : "text-base"}`}>
                {game.reward_message}
              </p>
            </div>
          ) : null}

          {!alreadyClaimed && (
            <p className="text-[13px] text-[#7a756c]">🎒 이 보상은 &quot;내 보물함&quot;에서 언제든 다시 확인할 수 있어요.</p>
          )}

          <div className="flex items-center justify-center gap-6 flex-wrap">
            <StatItem label="획득 열쇠" value={`🗝 ${session.keys}개`} seniorMode={seniorMode} />
            <StatItem label="획득 점수" value={`🏅 ${session.score}점`} seniorMode={seniorMode} />
            {elapsed !== null && (
              <StatItem label="소요 시간" value={`⏱ ${Math.floor(elapsed / 60)}분 ${elapsed % 60}초`} seniorMode={seniorMode} />
            )}
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button onClick={onRestart}
              className={`w-full rounded-xl border border-[#2a2924] font-medium text-[#7a756c] hover:border-[#3a3830] transition-colors ${btnH} ${ts}`}>
              다시 탐험하기
            </button>
            <button onClick={onExit}
              className={`w-full rounded-xl bg-[#b89a5a] font-bold text-[#0f0f10] hover:bg-[#c9aa6a] transition-colors ${btnH} ${seniorMode ? "text-xl" : "text-base"}`}>
              탐험 종료
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatItem({ label, value, seniorMode }: { label: string; value: string; seniorMode: boolean }) {
  return (
    <div className="text-center">
      <p className={`font-bold text-[#e8e4d9] ${seniorMode ? "text-2xl" : "text-lg"}`}>{value}</p>
      <p className={`text-[#5a5650] ${seniorMode ? "text-base" : "text-xs"}`}>{label}</p>
    </div>
  );
}
