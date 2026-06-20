"use server";
// app/api/admin/games/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function isAdmin(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return data?.role === "admin";
}

// GET: 공개 게임 목록 (관리자용 - 전체 정보)
export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await isAdmin(user.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("games")
    .select(`id, title, description, status, is_public, public_agreed_at, created_at, share_code, owner_id`)
    .eq("is_public", true)
    .is("deleted_at", null)
    .order("public_agreed_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, error: null });
}

// PATCH: 공개 게임 비공개 처리 (관리자)
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await isAdmin(user.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { gameId, is_public } = await req.json();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("games")
    .update({ is_public })
    .eq("id", gameId)
    .select("id, title, is_public")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, error: null });
}
