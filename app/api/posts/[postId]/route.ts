// app/api/posts/[postId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ postId: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { postId } = await params;
  const body = await req.json();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("posts").update(body).eq("id", postId)
    .select("*, quizzes(*), post_photo_missions(*)").single();
  if (error) return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  return NextResponse.json({ data, error: null });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { postId } = await params;
  const admin = createAdminClient();
  const { error } = await admin.from("posts").update({ is_active: false }).eq("id", postId);
  if (error) return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  return NextResponse.json({ data: { postId }, error: null });
}
