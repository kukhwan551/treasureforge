// app/api/play/sessions/route.ts
// 플레이어 세션 생성 및 업데이트
// 비로그인 사용자가 접근하므로 Service Role 키(admin client) 사용
// 수정: contact(휴대폰/이메일)로 players 테이블 upsert, character_id 저장

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function detectContactType(contact: string): "phone" | "email" {
  return contact.includes("@") ? "email" : "phone";
}

function normalizeContact(contact: string): string {
  // 이메일은 소문자 변환, 전화번호는 숫자만 추출
  if (contact.includes("@")) return contact.trim().toLowerCase();
  return contact.replace(/[^0-9]/g, "");
}

// ─────────────────────────────────────────────
// POST /api/play/sessions — 세션 생성
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: {
    game_id: string;
    nickname: string;
    character_id?: string;
    contact?: string;
  };
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

  try {
    const supabase = createAdminClient();

    // ── 연락처가 있으면 players 테이블에 upsert ──
    let playerId: string | null = null;
    const contact = body.contact?.trim() ? normalizeContact(body.contact.trim()) : undefined;
    if (contact) {
      const contactType = detectContactType(contact);

      const { data: existing } = await supabase
        .from("players")
        .select("id")
        .eq("contact", contact)
        .maybeSingle();

      if (existing) {
        playerId = existing.id;
        // 닉네임 최신화
        await supabase
          .from("players")
          .update({ nickname: body.nickname.trim() })
          .eq("id", existing.id);
      } else {
        const { data: created, error: createErr } = await supabase
          .from("players")
          .insert({
            contact,
            contact_type: contactType,
            nickname: body.nickname.trim(),
          })
          .select("id")
          .single();
        if (createErr) {
          console.error("[sessions POST] player create error", createErr);
        } else {
          playerId = created.id;
        }
      }
    }

    const { data, error } = await supabase
      .from("player_sessions")
      .insert({
        game_id:      body.game_id,
        nickname:     body.nickname.trim(),
        character_id: body.character_id ?? "explorer",
        player_id:    playerId,
      })
      .select()
      .single();

    if (error) {
      console.error("[sessions POST]", error);
      return NextResponse.json(
        { data: null, error: { message: error.message } },
        { status: 500 }
      );
    }

    // 이전 보상 수령 여부 확인
    let already_claimed = false;
    if (playerId) {
      const { data: prevSession } = await supabase
        .from("player_sessions")
        .select("id")
        .eq("game_id", body.game_id)
        .eq("player_id", playerId)
        .eq("reward_claimed", true)
        .neq("id", data.id)
        .limit(1)
        .maybeSingle();
      already_claimed = !!prevSession;
    }
    return NextResponse.json({ data: { ...data, already_claimed }, error: null }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "서버 오류가 발생했습니다.";
    return NextResponse.json(
      { data: null, error: { message } },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────
// PATCH /api/play/sessions — 세션 업데이트
// ─────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  let body: {
    session_id: string;
    keys?: number;
    completed_post_ids?: string[];
    score?: number;
    finished_at?: string;
    reward_claimed?: boolean;
    reward_claimed_at?: string;
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
  if (!session_id) {
    return NextResponse.json(
      { data: null, error: { message: "session_id가 필요합니다." } },
      { status: 400 }
    );
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("player_sessions")
      .update(patch)
      .eq("id", session_id)
      .select()
      .single();

    if (error) {
      console.error("[sessions PATCH]", error);
      return NextResponse.json(
        { data: null, error: { message: error.message } },
        { status: 500 }
      );
    }

    // 게임 완료 시 보물 카운트 감소
    if (body.finished_at && data?.game_id) {
      await supabase.rpc("increment_reward_count", { game_id: data.game_id });
    }
    return NextResponse.json({ data, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "서버 오류가 발생했습니다.";
    return NextResponse.json(
      { data: null, error: { message } },
      { status: 500 }
    );
  }
}
