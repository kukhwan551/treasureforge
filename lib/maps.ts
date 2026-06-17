// lib/maps.ts
// Supabase Storage 업로드 + maps 테이블 CRUD

import { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "maps";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────

export interface MapRecord {
  id: string;
  game_id: string;
  storage_path: string;
  public_url: string;
  width: number | null;
  height: number | null;
  file_size: number | null;
  created_at: string;
}

// ─────────────────────────────────────────────
// 업로드 (Storage → maps 테이블 insert)
// ─────────────────────────────────────────────

export async function uploadMap(
  supabase: SupabaseClient,
  gameId: string,
  file: File
): Promise<MapRecord> {
  // 유효성 검사
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("JPG, PNG, WEBP 파일만 업로드할 수 있습니다.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("파일 크기는 10MB를 초과할 수 없습니다.");
  }

  // 현재 유저 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("로그인이 필요합니다.");

  // 기존 지도 삭제 (게임당 1개)
  await deleteMapByGameId(supabase, gameId);

  // storage 경로: {userId}/{gameId}/{timestamp}.{ext}
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/${gameId}/${Date.now()}.${ext}`;

  // Storage 업로드
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw new Error(uploadError.message);

  // Public URL 획득
  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);

  // 이미지 크기 측정
  const { width, height } = await getImageDimensions(file);

  // maps 테이블에 저장
  const { data, error: dbError } = await supabase
    .from("maps")
    .insert({
      game_id:      gameId,
      storage_path: path,
      public_url:   urlData.publicUrl,
      width,
      height,
      file_size:    file.size,
    })
    .select()
    .single();

  if (dbError) throw new Error(dbError.message);
  return data as MapRecord;
}

// ─────────────────────────────────────────────
// 조회 — 게임 ID로 지도 가져오기
// ─────────────────────────────────────────────

export async function getMapByGameId(
  supabase: SupabaseClient,
  gameId: string
): Promise<MapRecord | null> {
  const { data, error } = await supabase
    .from("maps")
    .select("*")
    .eq("game_id", gameId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as MapRecord | null;
}

// ─────────────────────────────────────────────
// 삭제
// ─────────────────────────────────────────────

export async function deleteMapByGameId(
  supabase: SupabaseClient,
  gameId: string
): Promise<void> {
  // 기존 레코드 조회
  const existing = await getMapByGameId(supabase, gameId);
  if (!existing) return;

  // Storage에서 파일 삭제
  await supabase.storage.from(BUCKET).remove([existing.storage_path]);

  // DB에서 레코드 삭제
  await supabase.from("maps").delete().eq("id", existing.id);
}

// ─────────────────────────────────────────────
// 헬퍼 — 이미지 크기 측정
// ─────────────────────────────────────────────

function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}
