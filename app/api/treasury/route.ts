// app/api/treasury/route.ts
// 연락처로 완료한 게임 + 보상 목록 조회

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const contact = req.nextUrl.searchParams.get("contact")?.trim();

  if (!contact) {
    return NextResponse.json(
      { data: null, error: { message: "연락처를 입력해 주세요." } },
      { status: 400 }
    );
  }

  try {
    const supabase = createAdminClient();

    // 1. 연락처로 player 찾기
    const { data: player } = await supabase
      .from("players")
      .select("id, nickname, contact")
      .eq("contact", contact)
      .maybeSingle();

    if (!player) {
      return NextResponse.json({ data: { player: null, sessions: [] }, error: null });
    }

    // 2. 해당 player의 완료된 세션 + 게임 정보 조회
    const { data: sessions, error } = await supabase
      .from("player_sessions")
      .select(`
        id, nickname, keys, score, started_at, finished_at,
        reward_claimed, reward_claimed_at, character_id,
        games (
          id, title, description, reward_message, reward_type
        )
      `)
      .eq("player_id", player.id)
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false });

    if (error) {
      console.error("[treasury GET]", error);
      return NextResponse.json(
        { data: null, error: { message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: { player, sessions: sessions ?? [] },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ data: null, error: { message } }, { status: 500 });
  }
}
