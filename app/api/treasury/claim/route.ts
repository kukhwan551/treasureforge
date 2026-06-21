// app/api/treasury/claim/route.ts
// 보상 수령 처리

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  let body: { session_id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { message: "잘못된 요청입니다." } },
      { status: 400 }
    );
  }

  if (!body.session_id) {
    return NextResponse.json(
      { data: null, error: { message: "session_id가 필요합니다." } },
      { status: 400 }
    );
  }

  try {
    const supabase = createAdminClient();
    // 세션 조회 (game_id 확인용)
    const { data: session, error: sessionErr } = await supabase
      .from("player_sessions")
      .select("id, game_id, reward_claimed")
      .eq("id", body.session_id)
      .single();

    if (sessionErr || !session) {
      return NextResponse.json(
        { data: null, error: { message: "세션을 찾을 수 없습니다." } },
        { status: 404 }
      );
    }

    if (session.reward_claimed) {
      return NextResponse.json(
        { data: null, error: { message: "이미 보상을 수령했습니다." } },
        { status: 400 }
      );
    }

    // 보물 수량 확인
    const { data: game } = await supabase
      .from("games")
      .select("reward_limit, reward_claimed_count, reward_expires_at")
      .eq("id", session.game_id)
      .single();

    if (game) {
      const now = new Date();
      const expired = game.reward_expires_at && new Date(game.reward_expires_at) < now;
      const limitReached = game.reward_limit != null &&
        (game.reward_claimed_count ?? 0) >= game.reward_limit;
      if (expired || limitReached) {
        return NextResponse.json(
          { data: null, error: { message: "보물이 모두 소진되었습니다." }, exhausted: true },
          { status: 200 }
        );
      }
    }

    // 세션 보상 수령 처리
    const { data, error } = await supabase
      .from("player_sessions")
      .update({
        reward_claimed: true,
        reward_claimed_at: new Date().toISOString(),
      })
      .eq("id", body.session_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { data: null, error: { message: error.message } },
        { status: 500 }
      );
    }

    // 게임 보물 카운트 +1
    if (game) {
      await supabase.rpc("increment_reward_count", { game_id: session.game_id });
    }

    return NextResponse.json({ data, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ data: null, error: { message } }, { status: 500 });
  }
}
