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

    return NextResponse.json({ data, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ data: null, error: { message } }, { status: 500 });
  }
}
