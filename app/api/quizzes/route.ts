// app/api/quizzes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const input = await req.json();
  const admin = createAdminClient();

  const { data: last } = await admin
    .from("quizzes").select("order_index")
    .eq("post_id", input.post_id)
    .order("order_index", { ascending: false })
    .limit(1).maybeSingle();

  const { data, error } = await admin
    .from("quizzes")
    .insert({ ...input, order_index: (last?.order_index ?? -1) + 1 })
    .select("*").single();

  if (error) return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  return NextResponse.json({ data, error: null }, { status: 201 });
}
