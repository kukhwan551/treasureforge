// app/api/photo-missions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { post_id, keywords, guide_text, hint_image_url } = body;
  if (!post_id) return NextResponse.json({ error: { message: "post_id 필요" } }, { status: 400 });

  const supabase = createAdminClient();

  // 기존 row 확인
  const { data: existing } = await supabase
    .from("post_photo_missions")
    .select("id")
    .eq("post_id", post_id)
    .maybeSingle();

  let data, error;

  if (existing?.id) {
    ({ data, error } = await supabase
      .from("post_photo_missions")
      .update({ keywords: keywords ?? "", guide_text: guide_text ?? "", hint_image_url: hint_image_url ?? null })
      .eq("id", existing.id)
      .select()
      .single());
  } else {
    ({ data, error } = await supabase
      .from("post_photo_missions")
      .insert({ post_id, keywords: keywords ?? "", guide_text: guide_text ?? "", hint_image_url: hint_image_url ?? null })
      .select()
      .single());
  }

  if (error) return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  return NextResponse.json({ data, error: null });
}
