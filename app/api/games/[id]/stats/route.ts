// app/api/games/[id]/stats/route.ts
// 수정: 순 방문자 수 (session_id 중복 제거) 추가

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id: gameId } = await params;
  const supabase = await createClient();

  // 소유자 확인
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: game } = await supabase
    .from("games").select("owner_id, title").eq("id", gameId).single();
  if (!game || game.owner_id !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();

  // 전체 클릭 데이터 (session_id 포함)
  const { data: allClicks } = await admin
    .from("ad_clicks")
    .select("quiz_id, hint_url, session_id, clicked_at")
    .eq("game_id", gameId)
    .order("clicked_at", { ascending: false });

  const clicks = allClicks ?? [];

  // 총 클릭 수
  const totalClicks = clicks.length;

  // 순 방문자 수 (session_id 중복 제거, null 제외)
  const uniqueSessions = new Set(
    clicks.filter((c) => c.session_id).map((c) => c.session_id)
  );
  const uniqueVisitors = uniqueSessions.size;

  // 퀴즈별 집계
  const quizStatsMap: Record<string, {
    quiz_id:    string;
    hint_url:   string;
    count:      number;
    unique:     number;  // 순 방문자
    sessions:   Set<string>;
    last_click: string;
  }> = {};

  for (const row of clicks) {
    const key = `${row.quiz_id}_${row.hint_url}`;
    if (!quizStatsMap[key]) {
      quizStatsMap[key] = {
        quiz_id:    row.quiz_id,
        hint_url:   row.hint_url,
        count:      0,
        unique:     0,
        sessions:   new Set(),
        last_click: row.clicked_at,
      };
    }
    quizStatsMap[key].count++;
    if (row.session_id) quizStatsMap[key].sessions.add(row.session_id);
  }

  // Set → 숫자로 변환
  const byQuiz = Object.values(quizStatsMap).map((s) => ({
    quiz_id:    s.quiz_id,
    hint_url:   s.hint_url,
    count:      s.count,
    unique:     s.sessions.size,
    last_click: s.last_click,
  }));

  // 퀴즈 이름 조회
  const quizIds = [...new Set(byQuiz.map((s) => s.quiz_id).filter(Boolean))];
  const { data: quizzes } = await admin
    .from("quizzes")
    .select("id, question, posts(name)")
    .in("id", quizIds);
  const quizMap = Object.fromEntries((quizzes ?? []).map((q) => [q.id, q]));

  // 날짜별 클릭 수 (최근 14일)
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const recentClicks = clicks.filter((c) => c.clicked_at >= since);

  const dailyMap: Record<string, { count: number; sessions: Set<string> }> = {};
  for (const row of recentClicks) {
    const day = row.clicked_at.slice(0, 10);
    if (!dailyMap[day]) dailyMap[day] = { count: 0, sessions: new Set() };
    dailyMap[day].count++;
    if (row.session_id) dailyMap[day].sessions.add(row.session_id);
  }
  const dailyClicks = Object.entries(dailyMap).map(([date, d]) => ({
    date,
    count:  d.count,
    unique: d.sessions.size,
  })).sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    data: {
      game_title:     game.title,
      total_clicks:   totalClicks,
      unique_visitors: uniqueVisitors,
      by_quiz: byQuiz.map((s) => ({
        ...s,
        quiz_question: quizMap[s.quiz_id]?.question ?? "알 수 없음",
        post_name:     (quizMap[s.quiz_id]?.posts as any)?.name ?? "",
      })),
      daily_clicks: dailyClicks,
    },
    error: null,
  });
}
