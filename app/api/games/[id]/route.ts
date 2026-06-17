// app/api/games/[id]/route.ts
// 모든 DB 작업을 admin 클라이언트로 처리 (RLS 완전 우회)
// 소유자 확인은 코드 레벨에서 처리

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

// 소유자 확인 헬퍼
async function verifyOwner(userId: string, gameId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("games")
    .select("owner_id")
    .eq("id", gameId)
    .is("deleted_at", null)
    .single();
  return data?.owner_id === userId;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("games")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 404 });
  return NextResponse.json({ data, error: null });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { message: "Unauthorized" } }, { status: 401 });

  const isOwner = await verifyOwner(user.id, id);
  if (!isOwner) return NextResponse.json({ data: null, error: { message: "Forbidden" } }, { status: 403 });

  const body = await req.json();
  console.log("[PATCH /api/games/:id] body:", JSON.stringify(body));

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("games")
    .update(body)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("[updateGame] error:", error);
    return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 });
  }
  console.log("[updateGame] saved order_mode:", data?.order_mode);
  return NextResponse.json({ data, error: null });
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { message: "Unauthorized" } }, { status: 401 });

  // ★ admin으로 소유자 확인 (RLS 우회)
  const isOwner = await verifyOwner(user.id, id);
  if (!isOwner) return NextResponse.json({ data: null, error: { message: "Forbidden" } }, { status: 403 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("games")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[deleteGame] error:", error);
    return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 });
  }
  return NextResponse.json({ data: { id }, error: null });
}
