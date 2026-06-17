// app/api/track/hint-click/route.ts
// 힌트 URL 클릭 추적 + 리다이렉트

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { quiz_id, game_id, session_id, hint_url } = await req.json();

    if (!hint_url) {
      return NextResponse.json({ error: "hint_url required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    await supabase.from("ad_clicks").insert({
      quiz_id:    quiz_id    ?? null,
      game_id:    game_id    ?? null,
      session_id: session_id ?? null,
      hint_url,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // 추적 실패해도 사용자 경험에 영향 없게 200 반환
    console.error("[hint-click]", err);
    return NextResponse.json({ ok: false });
  }
}

// GET: 리다이렉트 방식 (링크 직접 클릭 시)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const quiz_id    = searchParams.get("quiz_id");
  const game_id    = searchParams.get("game_id");
  const session_id = searchParams.get("session_id");
  const hint_url   = searchParams.get("url");

  if (!hint_url) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  // 비동기 추적 (응답 기다리지 않음)
  try {
    const supabase = createAdminClient();
    supabase.from("ad_clicks").insert({
      quiz_id, game_id, session_id, hint_url,
    }).then(() => {}).catch(() => {});
  } catch {}

  // 광고주 페이지로 리다이렉트
  return NextResponse.redirect(hint_url);
}
