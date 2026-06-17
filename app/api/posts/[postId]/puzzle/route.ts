// app/api/posts/[postId]/puzzle/route.ts
// Service Role 클라이언트 사용 → RLS 우회

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPuzzle, upsertPuzzle, deletePuzzle } from "@/lib/puzzles";
import { z } from "zod";

type RouteContext = { params: Promise<{ postId: string }> };

const puzzleSchema = z.object({
  image_url:      z.string().url(),
  cols:           z.number().int().min(2).max(6),
  rows:           z.number().int().min(2).max(6),
  time_limit_sec: z.number().int().min(10).nullable(),
  hint_enabled:   z.boolean(),
});

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { postId } = await params;
  const supabase = createAdminClient();
  try {
    const puzzle = await getPuzzle(supabase, postId);
    return NextResponse.json({ data: puzzle, error: null });
  } catch (err) {
    return NextResponse.json(
      { data: null, error: { message: err instanceof Error ? err.message : "오류" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { postId } = await params;
  const supabase = createAdminClient();

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ data: null, error: { message: "잘못된 요청" } }, { status: 400 }); }

  const parsed = puzzleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { message: parsed.error.issues[0].message } },
      { status: 400 }
    );
  }

  try {
    const puzzle = await upsertPuzzle(supabase, postId, parsed.data);
    return NextResponse.json({ data: puzzle, error: null });
  } catch (err) {
    console.error("[puzzle route] error:", err);
    return NextResponse.json(
      { data: null, error: { message: err instanceof Error ? err.message : "오류" } },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { postId } = await params;
  const supabase = createAdminClient();
  try {
    await deletePuzzle(supabase, postId);
    return NextResponse.json({ data: { postId }, error: null });
  } catch (err) {
    return NextResponse.json(
      { data: null, error: { message: err instanceof Error ? err.message : "오류" } },
      { status: 500 }
    );
  }
}
