"use client";

// app/games/[id]/edit/page.tsx

import { useEffect, useState, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";

type GameDifficulty = "easy" | "medium" | "hard";
type TargetAgeGroup = "child" | "teen" | "adult" | "senior" | "all";
type GameStatus     = "draft" | "private" | "published" | "archived";
type GameOrderMode  = "free" | "sequential";

interface Game {
  id: string;
  title: string;
  description: string | null;
  difficulty: GameDifficulty;
  target_age: TargetAgeGroup;
  status: GameStatus;
  order_mode: GameOrderMode;
  share_code: string | null;
  entry_code: string | null;
  time_limit_sec: number | null;
  reward_message: string | null;
  reward_type: "message" | "coupon" | "certificate";
  compass_assist: boolean;
}

interface FormState {
  title: string;
  description: string;
  difficulty: GameDifficulty;
  target_age: TargetAgeGroup;
  status: GameStatus;
  order_mode: GameOrderMode;
  entry_code: string;
  time_limit_sec: number | null;
  reward_message: string;
  reward_type: "message" | "coupon" | "certificate";
  compass_assist: boolean;
}

const DIFFICULTY_OPTIONS = [
  { value: "easy"   as GameDifficulty, label: "쉬움",   hint: "단순한 단서",      selClass: "border-[#4a9d6f] bg-[#4a9d6f]/10" },
  { value: "medium" as GameDifficulty, label: "보통",   hint: "균형 잡힌 난이도", selClass: "border-[#b89a5a] bg-[#b89a5a]/10" },
  { value: "hard"   as GameDifficulty, label: "어려움", hint: "복잡한 퍼즐",      selClass: "border-[#c0504a] bg-[#c0504a]/10" },
];

const AGE_OPTIONS = [
  { value: "child"  as TargetAgeGroup, label: "어린이", emoji: "🐣" },
  { value: "teen"   as TargetAgeGroup, label: "청소년", emoji: "🎒" },
  { value: "adult"  as TargetAgeGroup, label: "성인",   emoji: "🧭" },
  { value: "senior" as TargetAgeGroup, label: "시니어", emoji: "🌿" },
  { value: "all"    as TargetAgeGroup, label: "전 연령", emoji: "✨" },
];

const STATUS_OPTIONS = [
  { value: "draft"     as GameStatus, label: "초안",   desc: "나만 볼 수 있음",              selClass: "border-[#3a3830] bg-[#2a2924]/50" },
  { value: "private"   as GameStatus, label: "비공개", desc: "입장 코드가 있는 사람만 참여", selClass: "border-[#7a6a4a] bg-[#3a2a14]/50" },
  { value: "published" as GameStatus, label: "공개",   desc: "링크가 있으면 누구나 참여",    selClass: "border-[#4a9d6f] bg-[#1a3a2a]/50" },
  { value: "archived"  as GameStatus, label: "보관",   desc: "신규 참여 불가",               selClass: "border-[#5a3a3a] bg-[#2a1a1a]/50" },
];

const ORDER_OPTIONS = [
  {
    value: "free" as GameOrderMode,
    label: "자유 탐험",
    desc: "모든 포스트를 순서 없이 자유롭게 탐험",
    emoji: "🗺️",
    selClass: "border-[#4a9d6f] bg-[#1a3a2a]/50",
  },
  {
    value: "sequential" as GameOrderMode,
    label: "순서대로",
    desc: "포스트를 order_index 순서대로 하나씩 해제",
    emoji: "📍",
    selClass: "border-[#b89a5a] bg-[#3a2a14]/50",
  },
];

const TIME_PRESETS = [
  { label: "5분",  sec: 300  },
  { label: "10분", sec: 600  },
  { label: "15분", sec: 900  },
  { label: "30분", sec: 1800 },
  { label: "1시간", sec: 3600 },
];

export default function EditGamePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [game, setGame]               = useState<Game | null>(null);
  const [loadError, setLoadError]     = useState<string | null>(null);
  const [form, setForm]               = useState<FormState>({
    title: "", description: "",
    difficulty: "medium", target_age: "all",
    status: "draft", order_mode: "free",
    entry_code: "", time_limit_sec: null,
    reward_message: "", reward_type: "message",
    compass_assist: false,
  });
  const [errors, setErrors]           = useState<{ title?: string; entry_code?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();
  const [copied, setCopied]           = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const res  = await fetch(`/api/games/${id}`);
      const json = await res.json();
      if (json.error) { setLoadError(json.error.message); return; }
      const g: Game = json.data;
      setGame(g);
      setForm({
        title:          g.title,
        description:    g.description    ?? "",
        difficulty:     g.difficulty,
        target_age:     g.target_age,
        status:         g.status,
        order_mode:     g.order_mode     ?? "free",
        entry_code:     g.entry_code     ?? "",
        time_limit_sec: g.time_limit_sec ?? null,
        reward_message: g.reward_message ?? "",
        reward_type:    g.reward_type    ?? "message",
        compass_assist: g.compass_assist ?? false,
      });
    })();
  }, [id]);

  function validate() {
    const e: typeof errors = {};
    if (!form.title.trim())          e.title = "제목을 입력해 주세요.";
    else if (form.title.trim().length < 2) e.title = "제목은 최소 2자 이상이어야 합니다.";
    if (form.status === "private") {
      if (!form.entry_code.trim())   e.entry_code = "비공개 모드에서는 입장 코드가 필요합니다.";
      else if (!/^\d{4,6}$/.test(form.entry_code.trim()))
        e.entry_code = "입장 코드는 4~6자리 숫자로 입력해 주세요.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/games/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title:          form.title.trim(),
            description:    form.description.trim() || null,
            difficulty:     form.difficulty,
            target_age:     form.target_age,
            status:         form.status,
            order_mode:     form.order_mode,
            entry_code:     form.entry_code.trim() || null,
            time_limit_sec: form.time_limit_sec,
            reward_message: form.reward_message.trim() || null,
            reward_type:    form.reward_type,
            compass_assist: form.compass_assist,
          }),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error.message);
        router.push("/games");
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "수정 중 오류가 발생했습니다.");
      }
    });
  }

  async function handleCopyLink() {
    if (!game?.share_code) return;
    await navigator.clipboard.writeText(`${window.location.origin}/play/${game.share_code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loadError) return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f10]">
      <p className="text-sm text-[#e07070]">{loadError}</p>
    </div>
  );

  if (!game) return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f10]">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#b89a5a] border-t-transparent"/>
    </div>
  );

  const timeSec = form.time_limit_sec;

  return (
    <div className="min-h-screen bg-[#0f0f10] text-[#e8e4d9]">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => router.push("/games")}
              className="text-xs font-medium tracking-widest text-[#b89a5a] uppercase hover:text-[#c9aa6a] transition-colors">
              게임 관리
            </button>
            <span className="text-[#3a3830]">/</span>
            <span className="text-xs text-[#5a5650] tracking-widest uppercase truncate max-w-[200px]">
              {game.title}
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-[#e8e4d9] tracking-tight">게임 수정</h1>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">

          {/* ── 기본 정보 ── */}
          <Section title="기본 정보">
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <label className="text-sm font-medium text-[#c4bfb4]">
                  게임 제목 <span className="text-[#b89a5a]">*</span>
                </label>
                <span className="text-[11px] tabular-nums text-[#4a4840]">{form.title.length}/100</span>
              </div>
              <input type="text" maxLength={100} value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                onBlur={validate}
                className={iCls(!!errors.title)}
              />
              {errors.title && <Err>{errors.title}</Err>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <label className="text-sm font-medium text-[#c4bfb4]">게임 설명</label>
                <span className="text-[11px] tabular-nums text-[#4a4840]">{form.description.length}/500</span>
              </div>
              <textarea rows={3} maxLength={500} value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className={`${iCls(false)} resize-none`}
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-[#c4bfb4]">난이도</p>
              <div className="grid grid-cols-3 gap-2">
                {DIFFICULTY_OPTIONS.map((opt) => {
                  const sel = form.difficulty === opt.value;
                  return (
                    <button key={opt.value} type="button" aria-pressed={sel}
                      onClick={() => setForm((f) => ({ ...f, difficulty: opt.value }))}
                      className={`rounded-xl border px-3 py-3.5 text-left transition-all
                        ${sel ? opt.selClass : "border-[#2a2924] bg-[#18181a] hover:border-[#3a3830]"}`}>
                      <span className={`block text-sm font-medium ${sel ? "text-white" : "text-[#e8e4d9]"}`}>
                        {opt.label}
                      </span>
                      <span className={`mt-0.5 block text-[11px] ${sel ? "text-[#9a8f7a]" : "text-[#5a5650]"}`}>
                        {opt.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-[#c4bfb4]">대상 연령</p>
              <div className="flex flex-wrap gap-2">
                {AGE_OPTIONS.map((opt) => {
                  const sel = form.target_age === opt.value;
                  return (
                    <button key={opt.value} type="button" aria-pressed={sel}
                      onClick={() => setForm((f) => ({ ...f, target_age: opt.value }))}
                      className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-all
                        ${sel
                          ? "border-[#b89a5a] bg-[#b89a5a]/15 text-[#d4b06a]"
                          : "border-[#2a2924] bg-[#18181a] text-[#7a756c] hover:border-[#3a3830]"
                        }`}>
                      <span>{opt.emoji}</span>{opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </Section>

          {/* ── 탐험 순서 ── */}
          <Section title="탐험 순서">
            <p className="text-xs text-[#5a5650]">
              탐험자가 포스트를 탐험하는 방식을 설정합니다.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {ORDER_OPTIONS.map((opt) => {
                const sel = form.order_mode === opt.value;
                return (
                  <button key={opt.value} type="button" aria-pressed={sel}
                    onClick={() => setForm((f) => ({ ...f, order_mode: opt.value }))}
                    className={`rounded-xl border px-4 py-4 text-left transition-all
                      ${sel ? opt.selClass : "border-[#2a2924] bg-[#18181a] hover:border-[#3a3830]"}`}>
                    <span className="block text-xl mb-1">{opt.emoji}</span>
                    <span className={`block text-sm font-semibold
                      ${sel ? "text-[#e8e4d9]" : "text-[#7a756c]"}`}>
                      {opt.label}
                    </span>
                    <span className="block mt-0.5 text-[11px] text-[#5a5650] leading-snug">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
            {form.order_mode === "sequential" && (
              <div className="rounded-xl border border-[#b89a5a]/20 bg-[#b89a5a]/5 px-4 py-3">
                <p className="text-xs text-[#9a8f7a] leading-relaxed">
                  📍 포스트 배치 화면에서 설정한 <strong className="text-[#b89a5a]">order_index</strong> 순서대로
                  하나씩 해제됩니다. 이전 포스트를 완료해야 다음 포스트가 나타납니다.
                </p>
              </div>
            )}
          </Section>

          {/* ── 공개 설정 ── */}
          <Section title="공개 설정">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STATUS_OPTIONS.map((opt) => {
                const sel = form.status === opt.value;
                return (
                  <button key={opt.value} type="button" aria-pressed={sel}
                    onClick={() => setForm((f) => ({ ...f, status: opt.value }))}
                    className={`rounded-xl border px-3 py-3 text-left transition-all
                      ${sel ? opt.selClass : "border-[#2a2924] bg-[#141414] hover:border-[#3a3830]"}`}>
                    <span className={`block text-sm font-medium ${sel ? "text-[#e8e4d9]" : "text-[#7a756c]"}`}>
                      {opt.label}
                    </span>
                    <span className="block mt-0.5 text-[10px] text-[#5a5650] leading-tight">{opt.desc}</span>
                  </button>
                );
              })}
            </div>

            {form.status === "private" && (
              <div className="space-y-1.5 pt-1">
                <label className="text-sm font-medium text-[#c4bfb4]">
                  입장 코드 <span className="text-[#b89a5a]">*</span>
                  <span className="ml-1.5 text-[11px] text-[#4a4840] font-normal">(4~6자리 숫자)</span>
                </label>
                <input type="text" maxLength={6} inputMode="numeric" value={form.entry_code}
                  onChange={(e) => setForm((f) => ({ ...f, entry_code: e.target.value.replace(/\D/g, "") }))}
                  placeholder="예: 1234"
                  autoComplete="off"
                  className={`${iCls(!!errors.entry_code)} w-36 font-mono tracking-widest text-center text-lg`}
                />
                {errors.entry_code && <Err>{errors.entry_code}</Err>}
              </div>
            )}

            {game.share_code && (form.status === "published" || form.status === "private") && (
              <div className="space-y-1.5 pt-1">
                <label className="text-sm font-medium text-[#c4bfb4]">공유 링크</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-xl border border-[#2a2924] bg-[#141414] px-3 py-2 text-xs text-[#7a756c] truncate font-mono">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/play/${game.share_code}`
                      : `/play/${game.share_code}`}
                  </code>
                  <button type="button" onClick={handleCopyLink}
                    className="shrink-0 rounded-xl border border-[#2a2924] px-3 py-2 text-xs text-[#7a756c] hover:border-[#3a3830] transition-colors">
                    {copied ? "✓ 복사됨" : "복사"}
                  </button>
                </div>
              </div>
            )}
          </Section>

          {/* ── 게임 제한시간 ── */}
          <Section title="게임 제한시간">
            <p className="text-xs text-[#5a5650]">
              전체 탐험 시간을 제한합니다. 시간이 초과되면 탐험이 리셋됩니다. 비워두면 무제한입니다.
            </p>
            <div className="flex items-center gap-3">
              <input type="number" min={60} max={7200} step={60}
                value={timeSec ?? ""}
                onChange={(e) => setForm((f) => ({
                  ...f, time_limit_sec: e.target.value === "" ? null : Number(e.target.value),
                }))}
                placeholder="초 단위 직접 입력"
                className={`${iCls(false)} w-44`}
              />
              <span className="text-sm text-[#5a5650]">초</span>
              {timeSec && (
                <span className="text-xs text-[#4a4840]">
                  ({Math.floor(timeSec / 60)}분 {timeSec % 60}초)
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {TIME_PRESETS.map((p) => (
                <button key={p.sec} type="button"
                  onClick={() => setForm((f) => ({ ...f, time_limit_sec: p.sec }))}
                  className={`rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-all
                    ${timeSec === p.sec
                      ? "border-[#b89a5a] bg-[#b89a5a]/15 text-[#b89a5a]"
                      : "border-[#2a2924] text-[#5a5650] hover:border-[#3a3830]"
                    }`}>
                  {p.label}
                </button>
              ))}
              <button type="button"
                onClick={() => setForm((f) => ({ ...f, time_limit_sec: null }))}
                className={`rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-all
                  ${timeSec === null
                    ? "border-[#b89a5a] bg-[#b89a5a]/15 text-[#b89a5a]"
                    : "border-[#2a2924] text-[#5a5650] hover:border-[#3a3830]"
                  }`}>
                무제한
              </button>
            </div>
          </Section>

          {/* ── 완료 보상 ── */}
          <Section title="완료 보상">
            <p className="text-xs text-[#5a5650]">모든 포스트를 완료한 참여자에게 보여줄 보상입니다.</p>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#c4bfb4]">보상 종류</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { v: "message",     label: "💌 메시지",  desc: "안내문/초청장" },
                  { v: "coupon",      label: "🎫 쿠폰",    desc: "코드/링크" },
                  { v: "certificate", label: "🏆 인증서",  desc: "실물상품 등" },
                ] as const).map((opt) => (
                  <button key={opt.v} type="button"
                    onClick={() => setForm((f) => ({ ...f, reward_type: opt.v }))}
                    className={`flex flex-col items-center gap-0.5 rounded-xl border py-2.5 px-1
                      transition-all active:scale-95
                      ${form.reward_type === opt.v
                        ? "border-[#b89a5a] bg-[#b89a5a]/15"
                        : "border-[#2a2924] hover:border-[#3a3830]"
                      }`}>
                    <span className="text-sm">{opt.label}</span>
                    <span className="text-[10px] text-[#5a5650]">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#c4bfb4]">
                보상 내용
                <span className="ml-1.5 text-xs text-[#5a5650]">
                  {form.reward_type === "coupon"
                    ? "(쿠폰 코드나 사용 링크를 적어주세요)"
                    : form.reward_type === "certificate"
                    ? "(수령 방법이나 안내를 적어주세요)"
                    : "(축하 메시지나 초청 문구를 적어주세요)"}
                </span>
              </label>
              <textarea rows={3} maxLength={500}
                value={form.reward_message}
                onChange={(e) => setForm((f) => ({ ...f, reward_message: e.target.value }))}
                placeholder={
                  form.reward_type === "coupon"
                    ? "예: 쿠폰코드 GOLD2026 / https://example.com/coupon"
                    : form.reward_type === "certificate"
                    ? "예: 이 화면을 매장에 보여주시면 상품을 드립니다."
                    : "예: 축하합니다! 보물을 찾으셨습니다 🎉"
                }
                className={`${iCls(false)} resize-none`}
              />
            </div>
          </Section>

          {/* ── 접근성: 찾기 도움 모드 ── */}
          <Section title="접근성">
            <p className="text-xs text-[#5a5650]">
              켜면 탐험가 캐릭터 옆에 나침반이 항상 표시되어, 가장 가까운
              미발견 포스트의 방향을 안내합니다. 포스트를 직접 보여주지는
              않으며, 시각적으로 찾기 어려운 참여자를 위한 보조 기능입니다.
            </p>
            <button type="button"
              onClick={() => setForm((f) => ({ ...f, compass_assist: !f.compass_assist }))}
              className={`flex w-full items-center justify-between rounded-xl border
                px-4 py-3.5 transition-colors
                ${form.compass_assist
                  ? "border-[#b89a5a] bg-[#b89a5a]/10"
                  : "border-[#2a2924] hover:border-[#3a3830]"
                }`}>
              <span className="flex items-center gap-2 text-sm font-medium text-[#c4bfb4]">
                <span className="text-lg">🧭</span> 찾기 도움 모드 (나침반)
              </span>
              <span className={`relative inline-flex h-6 w-11 items-center rounded-full
                transition-colors
                ${form.compass_assist ? "bg-[#b89a5a]" : "bg-[#2a2924]"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-[#0f0f10]
                  transition-transform
                  ${form.compass_assist ? "translate-x-6" : "translate-x-1"}`}/>
              </span>
            </button>
          </Section>

          {submitError && (
            <div className="rounded-lg border border-[#c0504a]/30 bg-[#c0504a]/10 px-4 py-3 text-sm text-[#e07070]">
              {submitError}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between pt-2">
            <button type="button" onClick={() => router.push("/games")}
              className="rounded-xl border border-[#2a2924] px-5 py-2.5 text-sm text-[#7a756c] hover:border-[#3a3830] transition-colors">
              ← 목록으로
            </button>
            <div className="flex gap-3">
              <button type="button" onClick={() => router.push(`/games/${id}/map`)}
                className="flex items-center gap-1.5 rounded-xl border border-[#2a2924] px-4 py-2.5 text-sm text-[#7a756c] hover:border-[#3a3830] transition-colors">
                <MapIcon /> 지도 관리
              </button>
              <button type="submit" disabled={isPending}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#b89a5a] px-6 py-2.5 text-sm font-medium text-[#0f0f10] hover:bg-[#c9aa6a] disabled:opacity-60 transition-colors">
                {isPending ? <><SpinnerIcon /> 저장 중…</> : "변경 사항 저장"}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#2a2924] bg-[#18181a] p-5 space-y-4">
      <h2 className="text-sm font-semibold text-[#e8e4d9]">{title}</h2>
      {children}
    </div>
  );
}

function Err({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-[#e07070]" role="alert">{children}</p>;
}

function iCls(hasErr: boolean) {
  return [
    "w-full rounded-xl border bg-[#18181a] px-3.5 py-2.5 text-sm",
    "text-[#e8e4d9] placeholder:text-[#3a3830] transition-colors",
    "focus:outline-none focus:ring-1",
    hasErr
      ? "border-[#c0504a]/60 focus:border-[#c0504a] focus:ring-[#c0504a]/30"
      : "border-[#2a2924] hover:border-[#3a3830] focus:border-[#b89a5a] focus:ring-[#b89a5a]/20",
  ].join(" ");
}

function MapIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
      <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
}
