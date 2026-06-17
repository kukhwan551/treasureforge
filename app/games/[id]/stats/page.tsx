"use client";

// app/games/[id]/stats/page.tsx
// 수정: 순 방문자 수 추가

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface QuizStat {
  quiz_id:       string;
  hint_url:      string;
  count:         number;
  unique:        number;
  last_click:    string;
  quiz_question: string;
  post_name:     string;
}

interface DailyClick {
  date:   string;
  count:  number;
  unique: number;
}

interface StatsData {
  game_title:      string;
  total_clicks:    number;
  unique_visitors: number;
  by_quiz:         QuizStat[];
  daily_clicks:    DailyClick[];
}

export default function StatsPage() {
  const { id: gameId } = useParams<{ id: string }>();
  const router = useRouter();

  const [stats,   setStats]   = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [view,    setView]    = useState<"total" | "unique">("total");

  useEffect(() => {
    if (!gameId) return;
    fetch(`/api/games/${gameId}/stats`)
      .then((r) => r.json())
      .then((j) => { if (j.error) throw new Error(j.error); setStats(j.data); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [gameId]);

  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().slice(0, 10);
  });

  const dailyMap = Object.fromEntries(
    (stats?.daily_clicks ?? []).map((d) => [d.date, d])
  );

  const maxVal = Math.max(
    ...last14.map((d) =>
      view === "total" ? (dailyMap[d]?.count ?? 0) : (dailyMap[d]?.unique ?? 0)
    ), 1
  );

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f10]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#b89a5a] border-t-transparent"/>
    </div>
  );

  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f10]">
      <p className="text-sm text-[#e07070]">{error}</p>
    </div>
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-[#0f0f10] text-[#e8e4d9]">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">

        {/* 네비게이션 */}
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          <button onClick={() => router.push("/games")}
            className="text-xs text-[#b89a5a] hover:text-[#c9aa6a] transition-colors">
            게임 목록
          </button>
          <span className="text-[#2a2924]">/</span>
          <button onClick={() => router.push(`/games/${gameId}/edit`)}
            className="text-xs text-[#5a5650] hover:text-[#7a756c] transition-colors">
            {stats?.game_title}
          </button>
          <span className="text-[#2a2924]">/</span>
          <span className="text-xs text-[#b89a5a]">광고 통계</span>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#e8e4d9]">📊 광고 클릭 통계</h1>
          <p className="text-sm text-[#5a5650] mt-1">{stats?.game_title}</p>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="총 클릭 수"    value={stats?.total_clicks    ?? 0} unit="회" color="#b89a5a" icon="👆"/>
          <StatCard label="순 방문자 수"  value={stats?.unique_visitors  ?? 0} unit="명" color="#4a9d6f" icon="👤"
            tooltip="같은 탐험자의 중복 클릭을 제외한 수"/>
          <StatCard label="광고 연결 퀴즈" value={stats?.by_quiz.length  ?? 0} unit="개" color="#6a8adf" icon="🔗"/>
          <StatCard label="오늘 클릭"     value={dailyMap[today]?.count  ?? 0} unit="회" color="#9a6adf" icon="📅"/>
        </div>

        {/* 총 vs 순 비교 */}
        {(stats?.total_clicks ?? 0) > 0 && (
          <div className="rounded-2xl border border-[#2a2924] bg-[#18181a] p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-[#5a5650]">클릭 대비 순 방문자 비율</p>
              <span className="text-lg font-bold text-[#4a9d6f]">
                {stats && stats.total_clicks > 0
                  ? Math.round((stats.unique_visitors / stats.total_clicks) * 100)
                  : 0}%
              </span>
            </div>
            <div className="h-2 bg-[#2a2924] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#b89a5a] to-[#4a9d6f] rounded-full transition-all"
                style={{
                  width: stats && stats.total_clicks > 0
                    ? `${(stats.unique_visitors / stats.total_clicks) * 100}%`
                    : "0%"
                }}/>
            </div>
            <div className="flex justify-between mt-2 text-[11px] text-[#3a3830]">
              <span>총 클릭 {stats?.total_clicks ?? 0}회</span>
              <span>순 방문자 {stats?.unique_visitors ?? 0}명</span>
            </div>
          </div>
        )}

        {/* 일별 차트 */}
        <div className="rounded-2xl border border-[#2a2924] bg-[#18181a] p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-[#e8e4d9]">
              📈 최근 14일 추이
            </h2>
            {/* 토글 */}
            <div className="flex rounded-lg border border-[#2a2924] overflow-hidden">
              {(["total", "unique"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1 text-xs transition-colors
                    ${view === v
                      ? "bg-[#b89a5a] text-[#0f0f10] font-medium"
                      : "text-[#5a5650] hover:text-[#7a756c]"
                    }`}>
                  {v === "total" ? "총 클릭" : "순 방문자"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-end gap-1 h-32">
            {last14.map((date) => {
              const val     = view === "total"
                ? (dailyMap[date]?.count  ?? 0)
                : (dailyMap[date]?.unique ?? 0);
              const pct     = (val / maxVal) * 100;
              const isToday = date === today;
              return (
                <div key={date} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="w-full relative flex items-end" style={{ height: 100 }}>
                    <div className="w-full rounded-t-sm transition-all duration-500"
                      style={{
                        height:     `${Math.max(pct, val > 0 ? 4 : 0)}%`,
                        background: isToday
                          ? (view === "total" ? "#b89a5a" : "#4a9d6f")
                          : (view === "total" ? "#3a3830" : "#2a4a3a"),
                      }}/>
                    {val > 0 && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2
                        opacity-0 group-hover:opacity-100 transition-opacity
                        bg-[#0f0f10] border border-[#2a2924] rounded px-1.5 py-0.5
                        text-[10px] text-[#e8e4d9] whitespace-nowrap z-10">
                        {val}{view === "total" ? "회" : "명"}
                      </div>
                    )}
                  </div>
                  <span className={`text-[9px] rotate-45 origin-left
                    ${isToday ? "text-[#b89a5a]" : "text-[#3a3830]"}`}>
                    {date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 퀴즈별 통계 */}
        <div className="rounded-2xl border border-[#2a2924] bg-[#18181a] p-6">
          <h2 className="text-sm font-semibold text-[#e8e4d9] mb-4">
            🔗 퀴즈별 광고 클릭 현황
          </h2>

          {(stats?.by_quiz.length ?? 0) === 0 ? (
            <div className="rounded-xl border border-dashed border-[#2a2924] py-12 text-center">
              <p className="text-sm text-[#3a3830]">아직 클릭 기록이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(stats?.by_quiz ?? []).sort((a, b) => b.count - a.count).map((s) => (
                <div key={`${s.quiz_id}_${s.hint_url}`}
                  className="rounded-xl border border-[#2a2924] bg-[#141414] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {s.post_name && (
                        <span className="inline-flex rounded-full bg-[#b89a5a]/15
                          px-2 py-0.5 text-[11px] text-[#b89a5a] mb-1">
                          📍 {s.post_name}
                        </span>
                      )}
                      <p className="text-sm text-[#c4bfb4] line-clamp-2 mb-2">
                        {s.quiz_question}
                      </p>
                      <a href={s.hint_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[#5a5650] hover:text-[#b89a5a]
                          transition-colors truncate block max-w-xs">
                        🔗 {s.hint_url}
                      </a>
                      <p className="text-[11px] text-[#3a3830] mt-1">
                        마지막 클릭: {new Date(s.last_click).toLocaleString("ko-KR")}
                      </p>
                    </div>

                    {/* 클릭 수 + 순 방문자 */}
                    <div className="shrink-0 text-right space-y-1">
                      <div>
                        <span className="text-2xl font-bold text-[#b89a5a]">{s.count}</span>
                        <span className="text-xs text-[#5a5650] ml-1">총 클릭</span>
                      </div>
                      <div>
                        <span className="text-lg font-bold text-[#4a9d6f]">{s.unique}</span>
                        <span className="text-xs text-[#5a5650] ml-1">순 방문자</span>
                      </div>
                    </div>
                  </div>

                  {/* 바 */}
                  <div className="mt-3 space-y-1">
                    <div className="h-1 bg-[#2a2924] rounded-full overflow-hidden">
                      <div className="h-full bg-[#b89a5a] rounded-full transition-all"
                        style={{ width: `${Math.min((s.count / (stats?.total_clicks || 1)) * 100, 100)}%` }}/>
                    </div>
                    <div className="flex justify-between text-[10px] text-[#3a3830]">
                      <span>전체의 {Math.round((s.count / (stats?.total_clicks || 1)) * 100)}%</span>
                      <span>재방문율 {s.unique > 0 ? Math.round(((s.count - s.unique) / s.count) * 100) : 0}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 안내 */}
        <div className="mt-6 rounded-xl border border-[#2a2924] bg-[#18181a]/50 px-5 py-4">
          <p className="text-xs text-[#5a5650] leading-relaxed">
            💡 <strong className="text-[#7a756c]">순 방문자</strong>는 같은 탐험자가 힌트를 여러 번 클릭해도
            1명으로 계산합니다. 광고주에게는 순 방문자 수를 기준으로 보고하는 것이 신뢰도가 높습니다.
          </p>
        </div>

      </div>
    </div>
  );
}

function StatCard({ label, value, unit, color, icon, tooltip }: {
  label: string; value: number; unit: string;
  color: string; icon: string; tooltip?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#2a2924] bg-[#18181a] p-5"
      title={tooltip}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <span className="text-xs text-[#5a5650]">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold tabular-nums" style={{ color }}>
          {value.toLocaleString()}
        </span>
        <span className="text-sm text-[#5a5650]">{unit}</span>
      </div>
    </div>
  );
}
