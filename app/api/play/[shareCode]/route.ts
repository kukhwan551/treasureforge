// app/api/play/[shareCode]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ shareCode: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { shareCode } = await params;
  const supabase = createAdminClient();

  const { data: game, error: gameErr } = await supabase
    .from("games")
    .select(`
      id, title, description, status, share_code,
      order_mode, reward_message, reward_type, time_limit_sec, compass_assist,
      reward_expires_at, reward_limit, reward_claimed_count,
      obstacle_type, obstacle_level
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
      mission_type, post_game_type, post_game_target, post_video_url, post_video_required_sec,
      time_limit_sec, score, is_active,
      quizzes (
        id, type, question, answer, options,
        pass_count, total_count, explanation,
        score, order_index, hint_text, hint_url
      ),
      post_puzzles (
        id, image_url, cols, rows,
        time_limit_sec, hint_enabled
      ),
      post_photo_missions (
        id, keywords, guide_text, hint_image_url
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

  const now = new Date();
  const is_exhausted =
    (game.reward_expires_at != null && new Date(game.reward_expires_at) < now) ||
    (game.reward_limit != null && (game.reward_claimed_count ?? 0) >= game.reward_limit);

  return NextResponse.json({
    data: {
      ...game,
      is_exhausted,
      map_url: mapData?.public_url ?? null,
      posts: (posts ?? []).map((p: Record<string, unknown>) => ({
        ...p,
        post_photo_missions: p.post_photo_missions
          ? Array.isArray(p.post_photo_missions) ? p.post_photo_missions : [p.post_photo_missions]
          : [],
      })),
    },
    error: null,
  });
}
