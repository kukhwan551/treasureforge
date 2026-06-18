// app/api/play/[shareCode]/route.ts
// 수정: posts에 puzzle 데이터 포함

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ shareCode: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { shareCode } = await params;
  const supabase = await createClient();

  const { data: game, error: gameErr } = await supabase
    .from("games")
    .select(`
      id, title, description, status, share_code,
      order_mode, reward_message, reward_type, time_limit_sec, compass_assist
    `)
    .eq("share_code", shareCode)
    .in("status", ["published", "private"])
    .is("deleted_at", null)
    .single();

  if (gameErr || !game) {
    return NextResponse.json(
      { data: null, error: { message: "게임을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  const { data: mapData } = await supabase
    .from("maps")
    .select("public_url")
    .eq("game_id", game.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: posts, error: postsErr } = await supabase
    .from("posts")
    .select(`
      id, name, description,
      coord_x, coord_y, radius,
      order_index, order_mode,
      mission_type,
      time_limit_sec, score, is_active,
      quizzes (
        id, type, question, answer, options,
        pass_count, total_count, explanation,
        score, order_index, hint_text, hint_url
      ),
      post_puzzles (
        id, image_url, cols, rows,
        time_limit_sec, hint_enabled
      )
    `)
    .eq("game_id", game.id)
    .eq("is_active", true)
    .not("coord_x", "is", null)
    .not("coord_y", "is", null)
    .order("order_index", { ascending: true });

  if (postsErr) {
    return NextResponse.json(
      { data: null, error: { message: "포스트 조회 오류" } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: {
      ...game,
      map_url: mapData?.public_url ?? null,
      posts:   posts ?? [],
    },
    error: null,
  });
}
