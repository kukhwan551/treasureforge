// app/api/games/[id]/map/route.ts
// maps 테이블 CRUD — admin 클라이언트 사용

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

// GET — 게임의 지도 조회
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id: gameId } = await params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("maps")
    .select("*")
    .eq("game_id", gameId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 });
  return NextResponse.json({ data, error: null });
}

// POST — 지도 업로드 (Storage + maps 테이블)
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id: gameId } = await params;
  const supabase = await createClient();
  const admin    = createAdminClient();

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { message: "Unauthorized" } }, { status: 401 });

  const formData = await req.formData();
  const file     = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ data: null, error: { message: "파일이 없습니다." } }, { status: 400 });

  // 유효성 검사
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type))
    return NextResponse.json({ data: null, error: { message: "JPG, PNG, WEBP만 가능합니다." } }, { status: 400 });
  if (file.size > 10 * 1024 * 1024)
    return NextResponse.json({ data: null, error: { message: "10MB를 초과할 수 없습니다." } }, { status: 400 });

  // 기존 지도 삭제
  const { data: existing } = await admin
    .from("maps").select("id, storage_path").eq("game_id", gameId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (existing) {
    await admin.storage.from("maps").remove([existing.storage_path]);
    await admin.from("maps").delete().eq("id", existing.id);
  }

  // Storage 업로드
  const ext  = file.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/${gameId}/${Date.now()}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadErr } = await admin.storage
    .from("maps")
    .upload(path, bytes, { upsert: true, contentType: file.type });

  if (uploadErr) return NextResponse.json({ data: null, error: { message: uploadErr.message } }, { status: 500 });

  // Public URL
  const { data: urlData } = admin.storage.from("maps").getPublicUrl(path);

  // maps 테이블 INSERT
  const { data, error: dbErr } = await admin
    .from("maps")
    .insert({
      game_id:      gameId,
      storage_path: path,
      public_url:   urlData.publicUrl,
      file_size:    file.size,
    })
    .select()
    .single();

  if (dbErr) return NextResponse.json({ data: null, error: { message: dbErr.message } }, { status: 500 });
  return NextResponse.json({ data, error: null }, { status: 201 });
}

// DELETE — 지도 삭제
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id: gameId } = await params;
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("maps").select("id, storage_path").eq("game_id", gameId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (existing) {
    await admin.storage.from("maps").remove([existing.storage_path]);
    await admin.from("maps").delete().eq("id", existing.id);
  }

  return NextResponse.json({ data: { gameId }, error: null });
}
