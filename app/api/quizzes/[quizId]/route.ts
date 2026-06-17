// app/api/quizzes/[quizId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ quizId: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { quizId } = await params;
  const body = await req.json();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("quizzes").update(body).eq("id", quizId).select("*").single();
  if (error) return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  return NextResponse.json({ data, error: null });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { quizId } = await params;
  const admin = createAdminClient();
  const { error } = await admin.from("quizzes").delete().eq("id", quizId);
  if (error) return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  return NextResponse.json({ data: { quizId }, error: null });
}
