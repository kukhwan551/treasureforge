// app/api/photo-missions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { post_id, keywords, guide_text } = body;
  if (!post_id) return NextResponse.json({ error: { message: "post_id 필요" } }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("post_photo_missions")
    .upsert({ post_id, keywords: keywords ?? "", guide_text: guide_text ?? "" }, { onConflict: "post_id" })
    .select().single();

  if (error) return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  return NextResponse.json({ data, error: null });
}
