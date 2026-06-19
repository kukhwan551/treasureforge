"use client";
// app/templates/page.tsx
// 내 템플릿 목록 페이지

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface TemplatePost {
  id: string;
  name: string;
  mission_type: string;
  time_limit_sec: number | null;
  order_index: number;
}

interface Template {
  id: string;
  title: string;
  description: string | null;
  difficulty: string;
  target_age: string;
  order_mode: string;
  time_limit_sec: number | null;
  compass_assist: boolean;
  created_at: string;
  template_posts: TemplatePost[];
}

const DIFFICULTY_LABEL: Record<string, string> = { easy: "쉬움", medium: "보통", hard: "어려움" };
const MISSION_LABEL:    Record<string, string> = { quiz: "퀴즈", puzzle: "그림퍼즐" };
const ORDER_LABEL:      Record<string, string> = { sequential: "순서대로", free: "자유" };

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [expanded,  setExpanded]  = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) throw new Error(j.error.message);
        setTemplates(j.data ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" 템플릿을 삭제하시겠습니까?`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setDeleting(null);
    }
  }

  function handleUseTemplate(template: Template) {
    // 템플릿 데이터를 sessionStorage에 저장 후 새 게임 만들기 페이지로 이동
    sessionStorage.setItem("template_draft", JSON.stringify(template));
    router.push("/games/new?from=template");
  }

  return (
    <div className="min-h-screen bg-[#0f0f10] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">

        {/* 헤더 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium tracking-widest text-[#b89a5a] uppercase mb-1">
              게임 템플릿
            </p>
            <h1 className="text-2xl font-semibold text-[#e8e4d9] tracking-tight">
              내 템플릿
            </h1>
          </div>
          <button
            onClick={() => router.push("/games")}
            className="rounded-xl border border-[#2a2924] px-4 py-2 text-sm
              text-[#7a756c] hover:border-[#3a3830] hover:text-[#9a9590] transition-colors">
            ← 게임 목록
          </button>
        </div>

        {/* 안내 */}
        <div className="mb-6 rounded-xl border border-[#2a2924] bg-[#141414] px-4 py-3">
          <p className="text-xs text-[#5a5650] leading-relaxed">
            📋 템플릿은 게임의 구조(제목·포스트 목록·미션 종류)를 저장합니다.
            <br/>
            "이 템플릿으로 게임 만들기"를 누르면 뼈대가 미리 채워진 새 게임을 시작할 수 있습니다.
            지도 이미지와 퀴즈 정답은 직접 입력해야 합니다.
          </p>
        </div>

        {/* 목록 */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#b89a5a] border-t-transparent"/>
          </div>
        ) : error ? (
          <p className="text-center text-sm text-[#e07070] py-16">{error}</p>
        ) : templates.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm text-[#5a5650]">저장된 템플릿이 없습니다.</p>
            <p className="text-xs text-[#3a3830] mt-1">
              게임 수정 화면 하단의 "템플릿으로 저장" 버튼을 사용해 보세요.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <div key={t.id}
                className="rounded-2xl border border-[#2a2924] bg-[#141414] overflow-hidden">

                {/* 템플릿 헤더 */}
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-semibold text-[#e8e4d9] truncate">
                        {t.title}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="text-xs text-[#5a5650]">
                          {DIFFICULTY_LABEL[t.difficulty] ?? t.difficulty}
                        </span>
                        <span className="text-[#3a3830]">·</span>
                        <span className="text-xs text-[#5a5650]">
                          {ORDER_LABEL[t.order_mode] ?? t.order_mode}
                        </span>
                        {t.time_limit_sec && (
                          <>
                            <span className="text-[#3a3830]">·</span>
                            <span className="text-xs text-[#5a5650]">
                              ⏱ {Math.floor(t.time_limit_sec / 60)}분
                            </span>
                          </>
                        )}
                        {t.compass_assist && (
                          <>
                            <span className="text-[#3a3830]">·</span>
                            <span className="text-xs text-[#b89a5a]">🧭 나침반</span>
                          </>
                        )}
                        <span className="text-[#3a3830]">·</span>
                        <span className="text-xs text-[#5a5650]">
                          포스트 {t.template_posts.length}개
                        </span>
                      </div>
                    </div>

                    {/* 버튼 */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                        className="text-xs text-[#5a5650] hover:text-[#9a9590] transition-colors">
                        {expanded === t.id ? "접기 ▲" : "펼치기 ▼"}
                      </button>
                    </div>
                  </div>

                  {t.description && (
                    <p className="mt-2 text-xs text-[#5a5650] line-clamp-2">{t.description}</p>
                  )}
                </div>

                {/* 포스트 목록 (펼쳐보기) */}
                {expanded === t.id && t.template_posts.length > 0 && (
                  <div className="border-t border-[#1e1e20] px-5 py-3 space-y-1.5">
                    {[...t.template_posts]
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((p, i) => (
                        <div key={p.id} className="flex items-center gap-2">
                          <span className="text-xs text-[#3a3830] w-5 text-right">{i + 1}.</span>
                          <span className="text-xs text-[#c4bfb4] flex-1">{p.name}</span>
                          <span className="text-[10px] text-[#4a4840] bg-[#1a1a1c]
                            border border-[#2a2924] rounded px-1.5 py-0.5">
                            {MISSION_LABEL[p.mission_type] ?? p.mission_type}
                          </span>
                          {p.time_limit_sec && (
                            <span className="text-[10px] text-[#4a4840]">{p.time_limit_sec}초</span>
                          )}
                        </div>
                      ))}
                  </div>
                )}

                {/* 액션 버튼 */}
                <div className="border-t border-[#1e1e20] px-5 py-3 flex items-center justify-between">
                  <button
                    onClick={() => handleDelete(t.id, t.title)}
                    disabled={deleting === t.id}
                    className="text-xs text-[#4a4840] hover:text-[#e07070] transition-colors disabled:opacity-50">
                    {deleting === t.id ? "삭제 중…" : "🗑 삭제"}
                  </button>
                  <button
                    onClick={() => handleUseTemplate(t)}
                    className="rounded-xl bg-[#b89a5a] px-4 py-2 text-xs font-medium
                      text-[#0f0f10] hover:bg-[#c9aa6a] transition-colors">
                    이 템플릿으로 게임 만들기 →
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
