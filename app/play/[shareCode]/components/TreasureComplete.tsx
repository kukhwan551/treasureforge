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
  const [phase, setPhase] = useState<"key" | "door" | "reward">("key");
  const [doorOpen, setDoorOpen] = useState(0); // 0=닫힘 1=완전열림
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
    const t1 = setTimeout(() => setPhase("door"), 1500);
    const t2 = setTimeout(() => setPhase("reward"), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []); // eslint-disable-line

  // 문 열림 애니메이션
  useEffect(() => {
    if (phase !== "door") return;
    let start: number | null = null;
    const duration = 2000;
    function animDoor(ts2: number) {
      if (!start) start = ts2;
      const progress = Math.min((ts2 - start) / duration, 1);
      // ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setDoorOpen(eased);
      if (progress < 1) requestAnimationFrame(animDoor);
    }
    requestAnimationFrame(animDoor);
  }, [phase]);

  // Canvas - 열쇠 애니메이션 (key phase)
  useEffect(() => {
    if (phase !== "key") return;
    const cvs = canvasRef.current;
    if (!cvs) return;
    const W = 320, H = 200;
    cvs.width = W; cvs.height = H;

    function animate() {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      frameRef.current++;
      const f = frameRef.current;
      if (phaseRef.current !== "key") { cancelAnimationFrame(rafRef.current); return; }

      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;
      const progress = Math.min(f / 50, 1);

      // 빛 배경
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80 * progress);
      glow.addColorStop(0, `rgba(255,215,0,${0.3 * progress})`);
      glow.addColorStop(1, "rgba(255,215,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // 열쇠 - 위에서 내려와 가운데서 빛남
      const ky = 30 + progress * (cy - 30);
      ctx.save();
      ctx.translate(cx, ky);
      ctx.rotate(Math.PI * 2 * (1 - progress));

      const grad = ctx.createLinearGradient(-30, -5, 30, 5);
      grad.addColorStop(0, "#ffd700");
      grad.addColorStop(0.5, "#fffacd");
      grad.addColorStop(1, "#b8860b");

      // 열쇠 머리
      ctx.strokeStyle = grad;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,215,0,${0.4 * progress})`;
      ctx.fill();
      ctx.fillStyle = "#b8860b";
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      // 열쇠 몸통
      ctx.strokeStyle = grad;
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(14, 0); ctx.lineTo(50, 0);
      ctx.stroke();
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(30, 0); ctx.lineTo(30, 12);
      ctx.moveTo(42, 0); ctx.lineTo(42, 9);
      ctx.stroke();

      ctx.restore();

      // 반짝임
      if (progress > 0.5) {
        const sparkles = [[cx-40,cy-20],[cx+50,cy-10],[cx-20,cy+30],[cx+30,cy+25]];
        sparkles.forEach(([sx,sy],i) => {
          const alpha = Math.sin(f * 0.2 + i) * 0.5 + 0.5;
          ctx.fillStyle = `rgba(255,255,200,${alpha * progress})`;
          ctx.font = "16px serif";
          ctx.textAlign = "center";
          ctx.fillText("✨", sx!, sy!);
        });
      }

      // 텍스트
      ctx.fillStyle = `rgba(184,154,90,${progress})`;
      ctx.font = `bold ${seniorMode ? 22 : 18}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("황금열쇠로 보물문을 여는 중...", cx, H - 20);

      rafRef.current = requestAnimationFrame(animate);
    }
    frameRef.current = 0;
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, seniorMode]);

  const elapsed = session.finished_at && session.started_at
    ? Math.floor((new Date(session.finished_at).getTime() - new Date(session.started_at).getTime()) / 1000)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0f0f10] overflow-hidden">

      {/* 별 배경 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="absolute animate-ping"
            style={{
              left: `${(i * 37 + 13) % 100}%`,
              top:  `${(i * 53 + 7) % 100}%`,
              width: (i % 3) + 2, height: (i % 3) + 2,
              borderRadius: "50%", background: "#b89a5a",
              animationDuration: `${(i % 3) + 1}s`,
              animationDelay: `${(i % 5) * 0.3}s`,
              opacity: 0.5,
            }}/>
        ))}
      </div>

      {/* 열쇠 애니메이션 */}
      {phase === "key" && (
        <div className="flex flex-col items-center">
          <canvas ref={canvasRef} style={{ width: 320, height: 200 }}/>
        </div>
      )}

      {/* 문 열림 애니메이션 */}
      {phase === "door" && (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* 문 뒤 빛 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="rounded-full"
              style={{
                width: `${doorOpen * 400}px`,
                height: `${doorOpen * 500}px`,
                background: `radial-gradient(ellipse, rgba(255,215,0,${doorOpen * 0.6}) 0%, transparent 70%)`,
                transition: "none",
              }}/>
          </div>

          {/* 왼쪽 문 */}
          <div className="absolute top-0 bottom-0 left-0 right-1/2 overflow-hidden"
            style={{ transformOrigin: "left center", perspective: "800px" }}>
            <div className="w-full h-full relative"
              style={{
                transformOrigin: "left center",
                transform: `perspective(800px) rotateY(${-doorOpen * 80}deg)`,
                transition: "none",
                background: "linear-gradient(135deg, #4a2c0a 0%, #7c4a1a 40%, #5a3510 100%)",
                borderRight: "3px solid #b87a3a",
              }}>
              {/* 왼쪽 문 장식 */}
              <div className="absolute inset-4 border-2 border-[#b87a3a]/60 rounded-lg"/>
              <div className="absolute inset-8 border border-[#b87a3a]/40 rounded"/>
              {/* 황금 장식 패턴 */}
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-4xl opacity-80">⚜️</div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl opacity-60">🌟</div>
              <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 text-4xl opacity-80">⚜️</div>
              {/* 문손잡이 */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-8 rounded-full bg-gradient-to-b from-[#ffd700] to-[#b8860b] shadow-lg"/>
            </div>
          </div>

          {/* 오른쪽 문 */}
          <div className="absolute top-0 bottom-0 left-1/2 right-0 overflow-hidden"
            style={{ transformOrigin: "right center", perspective: "800px" }}>
            <div className="w-full h-full relative"
              style={{
                transformOrigin: "right center",
                transform: `perspective(800px) rotateY(${doorOpen * 80}deg)`,
                transition: "none",
                background: "linear-gradient(225deg, #4a2c0a 0%, #7c4a1a 40%, #5a3510 100%)",
                borderLeft: "3px solid #b87a3a",
              }}>
              <div className="absolute inset-4 border-2 border-[#b87a3a]/60 rounded-lg"/>
              <div className="absolute inset-8 border border-[#b87a3a]/40 rounded"/>
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-4xl opacity-80">⚜️</div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl opacity-60">🌟</div>
              <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 text-4xl opacity-80">⚜️</div>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-8 rounded-full bg-gradient-to-b from-[#ffd700] to-[#b8860b] shadow-lg"/>
            </div>
          </div>

          {/* 문 가운데 텍스트 */}
          <div className="absolute z-10 text-center pointer-events-none"
            style={{ opacity: doorOpen }}>
            <p className={`font-bold text-[#ffd700] drop-shadow-lg animate-pulse ${seniorMode ? "text-2xl" : "text-xl"}`}>
              보물 창고가 열립니다! ✨
            </p>
          </div>
        </div>
      )}

      {/* 보상 화면 */}
      {phase === "reward" && (
        <div className="w-full max-w-md px-4 animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-4 text-center">
          <h1 className={`font-bold text-[#b89a5a] ${th}`}>🎉 보물을 발견했습니다!</h1>
          <p className={`text-[#7a756c] ${ts}`}>{session.nickname} 탐험가, 수고하셨습니다!</p>

          {alreadyClaimed ? (
            <div className="rounded-2xl border border-[#5a5650]/30 bg-[#1a1a1a] px-6 py-5">
              <p className="text-2xl mb-2">📦</p>
              <p className={`text-[#7a756c] ${seniorMode ? "text-xl" : "text-base"}`}>이미 보물을 획득하셨습니다.</p>
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
            <StatItem label="획득 열쇠" value={`🗝 ${session.keys}개`} seniorMode={seniorMode}/>
            <StatItem label="획득 점수" value={`🏅 ${session.score}점`} seniorMode={seniorMode}/>
            {elapsed !== null && (
              <StatItem label="소요 시간" value={`⏱ ${Math.floor(elapsed/60)}분 ${elapsed%60}초`} seniorMode={seniorMode}/>
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
