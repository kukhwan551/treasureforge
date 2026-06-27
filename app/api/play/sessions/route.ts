// app/api/play/sessions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function detectContactType(contact: string): "phone" | "email" {
  return contact.includes("@") ? "email" : "phone";
}
function normalizeContact(contact: string): string {
  if (contact.includes("@")) return contact.trim().toLowerCase();
  return contact.replace(/[^0-9]/g, "");
}

// GET - player total_points 조회
export async function GET(req: NextRequest) {
  const playerId = req.nextUrl.searchParams.get("player_id");
  if (!playerId) return NextResponse.json({ data: null, error: { message: "player_id 필요" } }, { status: 400 });
  const supabase = createAdminClient();
  const { data } = await supabase.from("players").select("total_points").eq("id", playerId).single();
  return NextResponse.json({ data: { total_points: data?.total_points ?? 0 }, error: null });
}

export async function POST(req: NextRequest) {
  let body: { game_id: string; nickname: string; character_id?: string; contact?: string; };
  try { body = await req.json(); }
  catch { return NextResponse.json({ data: null, error: { message: "잘못된 요청입니다." } }, { status: 400 }); }

  if (!body.game_id || !body.nickname?.trim()) {
    return NextResponse.json({ data: null, error: { message: "게임 ID와 닉네임이 필요합니다." } }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    let playerId: string | null = null;
    const contact = body.contact?.trim() ? normalizeContact(body.contact.trim()) : undefined;
    if (contact) {
      const contactType = detectContactType(contact);
      const { data: existing } = await supabase.from("players").select("id").eq("contact", contact).maybeSingle();
      if (existing) {
        playerId = existing.id;
        await supabase.from("players").update({ nickname: body.nickname.trim() }).eq("id", existing.id);
      } else {
        const { data: created, error: createErr } = await supabase.from("players")
          .insert({ contact, contact_type: contactType, nickname: body.nickname.trim() })
          .select("id").single();
        if (!createErr) playerId = created.id;
      }
    }

    const { data, error } = await supabase.from("player_sessions")
      .insert({ game_id: body.game_id, nickname: body.nickname.trim(), character_id: body.character_id ?? "explorer", player_id: playerId })
      .select().single();

    if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 });

    let already_claimed = false;
    if (playerId) {
      const { data: prevSession } = await supabase.from("player_sessions").select("id")
        .eq("game_id", body.game_id).eq("player_id", playerId)
        .not("finished_at", "is", null).neq("id", data.id).limit(1).maybeSingle();
      already_claimed = !!prevSession;
    }
    return NextResponse.json({ data: { ...data, already_claimed }, error: null }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ data: null, error: { message: err instanceof Error ? err.message : "서버 오류" } }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  let body: {
    session_id: string;
    keys?: number;
    completed_post_ids?: string[];
    score?: number;
    finished_at?: string;
    reward_claimed?: boolean;
    reward_claimed_at?: string;
    obstacle_hit_penalty?: number; // 장애물 충돌 시 차감 포인트
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ data: null, error: { message: "잘못된 요청입니다." } }, { status: 400 }); }

  const { session_id, obstacle_hit_penalty, ...patch } = body;
  if (!session_id) return NextResponse.json({ data: null, error: { message: "session_id가 필요합니다." } }, { status: 400 });

  try {
    const supabase = createAdminClient();

    // 업데이트 전 이전 상태 조회
    const { data: before } = await supabase.from("player_sessions")
      .select("completed_post_ids, player_id, game_id")
      .eq("id", session_id).single();

    const prevCount = (before?.completed_post_ids ?? []).length;

    // score는 completed_post_ids.length * 10으로 재계산
    const newPatch = { ...patch };
    if (patch.completed_post_ids !== undefined) {
      newPatch.score = patch.completed_post_ids.length * 10;
    }

    const { data, error } = await supabase.from("player_sessions")
      .update(newPatch).eq("id", session_id).select().single();

    if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 });

    // 게임 완료 시 보물 카운트
    if (body.finished_at && data?.game_id) {
      await supabase.rpc("increment_reward_count", { game_id: data.game_id });
    }

    // 포스트 통과 시 포인트 적립
    if (patch.completed_post_ids && before?.player_id) {
      const newCount = patch.completed_post_ids.length - prevCount;
      if (newCount > 0) {
        await supabase.rpc("increment_player_points", {
          p_player_id: before.player_id,
          p_points: newCount * 10,
        });
      }
    }

    // 장애물 충돌 시 포인트 차감
    if (obstacle_hit_penalty && obstacle_hit_penalty > 0 && before?.player_id) {
      // 현재 포인트 조회 후 차감 (0 미만 방지)
      const { data: playerData } = await supabase
        .from("players").select("total_points").eq("id", before.player_id).single();
      const currentPoints = playerData?.total_points ?? 0;
      const deduct = Math.min(obstacle_hit_penalty, currentPoints);
      if (deduct > 0) {
        await supabase.rpc("increment_player_points", {
          p_player_id: before.player_id,
          p_points: -deduct,
        });
      }
    }

    return NextResponse.json({ data, error: null });
  } catch (err) {
    return NextResponse.json({ data: null, error: { message: err instanceof Error ? err.message : "서버 오류" } }, { status: 500 });
  }
}
