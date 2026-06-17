// app/api/play/sessions/route.ts
// 플레이어 세션 생성 및 업데이트

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST — 세션 생성
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  let body: { game_id: string; nickname: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { message: "잘못된 요청입니다." } },
      { status: 400 }
    );
  }

  if (!body.game_id || !body.nickname?.trim()) {
    return NextResponse.json(
      { data: null, error: { message: "게임 ID와 닉네임이 필요합니다." } },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("player_sessions")
    .insert({
      game_id:  body.game_id,
      nickname: body.nickname.trim(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { data: null, error: { message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data, error: null }, { status: 201 });
}

// PATCH — 세션 업데이트 (열쇠, 완료 포스트, 점수)
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();

  let body: {
    session_id: string;
    keys?: number;
    completed_post_ids?: string[];
    score?: number;
    finished_at?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { message: "잘못된 요청입니다." } },
      { status: 400 }
    );
  }

  const { session_id, ...patch } = body;

  const { data, error } = await supabase
    .from("player_sessions")
    .update(patch)
    .eq("id", session_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { data: null, error: { message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data, error: null });
}
