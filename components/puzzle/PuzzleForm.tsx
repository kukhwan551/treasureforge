"use client";

// components/puzzle/PuzzleForm.tsx
// 관리자: 퍼즐 이미지 업로드 + 설정

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadPuzzleImage } from "@/lib/puzzles";
import type { PostPuzzle, CreatePuzzleInput } from "@/types/puzzle";

interface PuzzleFormProps {
  postId: string;
  initial?: PostPuzzle | null;
  onSaved: (puzzle: PostPuzzle) => void;
}

const GRID_OPTIONS = [
  { label: "3×3 (9조각) — 쉬움",  cols: 3, rows: 3 },
  { label: "4×4 (16조각) — 보통", cols: 4, rows: 4 },
  { label: "5×5 (25조각) — 어려움", cols: 5, rows: 5 },
];

const TIME_PRESETS = [
  { label: "1분",  sec: 60  },
  { label: "2분",  sec: 120 },
  { label: "3분",  sec: 180 },
  { label: "5분",  sec: 300 },
];

export default function PuzzleForm({ postId, initial, onSaved }: PuzzleFormProps) {
  const supabase = createClient();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [imageUrl,      setImageUrl]      = useState(initial?.image_url ?? "");
  const [previewUrl,    setPreviewUrl]    = useState(initial?.image_url ?? "");
  const [cols,          setCols]          = useState(initial?.cols ?? 3);
  const [rows,          setRows]          = useState(initial?.rows ?? 3);
  const [timeLimitSec,  setTimeLimitSec]  = useState<number | null>(initial?.time_limit_sec ?? 120);
  const [hintEnabled,   setHintEnabled]   = useState(initial?.hint_enabled ?? true);

  // ★ initial이 비동기로 로드될 때 상태 동기화
  useEffect(() => {
    if (initial?.image_url) {
      setImageUrl(initial.image_url);
      setPreviewUrl(initial.image_url);
      setCols(initial.cols ?? 3);
      setRows(initial.rows ?? 3);
      setTimeLimitSec(initial.time_limit_sec ?? 120);
      setHintEnabled(initial.hint_enabled ?? true);
    }
  }, [initial?.id]); // initial.id가 바뀔 때만 실행

  const [uploading, setUploading] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // 미리보기
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    setError(null);
    try {
      const url = await uploadPuzzleImage(supabase, postId, file);
      setImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!imageUrl) { setError("이미지를 업로드해 주세요."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts/${postId}/puzzle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url:      imageUrl,
          cols,
          rows,
          time_limit_sec: timeLimitSec,
          hint_enabled:   hintEnabled,
        } satisfies CreatePuzzleInput),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      onSaved(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  const selectedGrid = GRID_OPTIONS.find((g) => g.cols === cols && g.rows === rows);

  return (
    <div className="space-y-5">

      {/* 이미지 업로드 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#c4bfb4]">
          퍼즐 이미지 <span className="text-[#b89a5a]">*</span>
        </label>

        {previewUrl ? (
          <div className="relative group rounded-xl overflow-hidden border border-[#2a2924]">
            <img src={previewUrl} alt="퍼즐 이미지"
              className="w-full h-48 object-cover"/>
            <div className="absolute inset-0 flex items-center justify-center
              bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="rounded-xl bg-[#b89a5a] px-4 py-2 text-sm font-medium text-[#0f0f10]">
                이미지 변경
              </button>
            </div>
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="h-8 w-8 animate-spin rounded-full border-2
                  border-[#b89a5a] border-t-transparent"/>
              </div>
            )}
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-full h-40 rounded-xl border-2 border-dashed border-[#2a2924]
              flex flex-col items-center justify-center gap-2 text-[#5a5650]
              hover:border-[#b89a5a]/50 hover:text-[#b89a5a] transition-colors">
            {uploading ? (
              <div className="h-8 w-8 animate-spin rounded-full border-2
                border-[#b89a5a] border-t-transparent"/>
            ) : (
              <>
                <UploadIcon/>
                <span className="text-sm">클릭하여 이미지 업로드</span>
                <span className="text-xs text-[#4a4840]">JPG, PNG, WEBP 지원</span>
                <span className="text-xs text-[#b89a5a]/70">권장: 정사각형 1200×1200px · 500KB 이하</span>
              </>
            )}
          </button>
        )}

        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={handleFileChange}/>
      </div>

      {/* 분할 설정 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#c4bfb4]">조각 수</label>
        <div className="space-y-2">
          {GRID_OPTIONS.map((opt) => {
            const sel = cols === opt.cols && rows === opt.rows;
            return (
              <button key={`${opt.cols}x${opt.rows}`} type="button"
                onClick={() => { setCols(opt.cols); setRows(opt.rows); }}
                className={`w-full rounded-xl border px-4 py-3 text-left transition-all
                  ${sel
                    ? "border-[#b89a5a] bg-[#b89a5a]/15 text-[#e8e4d9]"
                    : "border-[#2a2924] bg-[#141414] text-[#7a756c] hover:border-[#3a3830]"
                  }`}>
                <span className="text-sm font-medium">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 제한시간 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#c4bfb4]">
          제한시간
          <span className="ml-1.5 text-[11px] text-[#4a4840] font-normal">(비워두면 무제한)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {TIME_PRESETS.map((p) => (
            <button key={p.sec} type="button"
              onClick={() => setTimeLimitSec(p.sec)}
              className={`rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-all
                ${timeLimitSec === p.sec
                  ? "border-[#b89a5a] bg-[#b89a5a]/15 text-[#b89a5a]"
                  : "border-[#2a2924] text-[#5a5650] hover:border-[#3a3830]"
                }`}>
              {p.label}
            </button>
          ))}
          <button type="button"
            onClick={() => setTimeLimitSec(null)}
            className={`rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-all
              ${timeLimitSec === null
                ? "border-[#b89a5a] bg-[#b89a5a]/15 text-[#b89a5a]"
                : "border-[#2a2924] text-[#5a5650] hover:border-[#3a3830]"
              }`}>
            무제한
          </button>
        </div>
        {timeLimitSec !== null && (
          <div className="flex items-center gap-2">
            <input type="number" min={10} max={600}
              value={timeLimitSec}
              onChange={(e) => setTimeLimitSec(Number(e.target.value))}
              className="w-24 rounded-xl border border-[#2a2924] bg-[#141414]
                px-3 py-2 text-sm text-[#e8e4d9] focus:outline-none focus:border-[#b89a5a]"
            />
            <span className="text-sm text-[#5a5650]">초 직접 입력</span>
          </div>
        )}
      </div>

      {/* 힌트 */}
      <div className="flex items-center justify-between rounded-xl border border-[#2a2924]
        bg-[#141414] px-4 py-3">
        <div>
          <p className="text-sm font-medium text-[#c4bfb4]">💡 힌트 허용</p>
          <p className="text-[11px] text-[#5a5650] mt-0.5">
            탐험자가 원본 이미지를 3초간 볼 수 있습니다
          </p>
        </div>
        <button type="button" onClick={() => setHintEnabled((v) => !v)}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2
            transition-all font-medium text-sm
            ${hintEnabled
              ? "border-[#b89a5a] bg-[#b89a5a]/15 text-[#b89a5a]"
              : "border-[#2a2924] bg-[#18181a] text-[#5a5650]"
            }`}>
          {hintEnabled
            ? <><EyeOnIcon/> ON — 힌트 허용</>
            : <><EyeOffIcon/> OFF — 힌트 숨김</>
          }
        </button>
      </div>

      {/* 미리보기 */}
      {previewUrl && selectedGrid && (
        <div className="rounded-xl border border-[#2a2924] bg-[#141414] p-3">
          <p className="text-[11px] text-[#5a5650] mb-2">
            조각 미리보기 — {cols}×{rows} = {cols * rows}조각
          </p>
          <div className="relative w-full aspect-video overflow-hidden rounded-lg">
            <img src={previewUrl} alt="미리보기"
              className="absolute inset-0 w-full h-full object-cover opacity-60"/>
            {/* 그리드 오버레이 */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100"
              preserveAspectRatio="none">
              {Array.from({ length: cols - 1 }).map((_, i) => (
                <line key={`v${i}`}
                  x1={((i + 1) / cols) * 100} y1={0}
                  x2={((i + 1) / cols) * 100} y2={100}
                  stroke="#b89a5a" strokeWidth="0.5" strokeDasharray="2,2"/>
              ))}
              {Array.from({ length: rows - 1 }).map((_, i) => (
                <line key={`h${i}`}
                  x1={0}   y1={((i + 1) / rows) * 100}
                  x2={100} y2={((i + 1) / rows) * 100}
                  stroke="#b89a5a" strokeWidth="0.5" strokeDasharray="2,2"/>
              ))}
            </svg>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-[#c0504a]/30 bg-[#c0504a]/10
          px-4 py-3 text-sm text-[#e07070]">{error}</div>
      )}

      <button type="button" onClick={handleSave} disabled={saving || uploading || !imageUrl}
        className="w-full rounded-xl bg-[#b89a5a] py-3 font-medium text-[#0f0f10]
          hover:bg-[#c9aa6a] disabled:opacity-50 transition-colors">
        {saving ? "저장 중…" : initial ? "퍼즐 수정" : "퍼즐 저장"}
      </button>
    </div>
  );
}

function EyeOnIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function UploadIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>;
}
