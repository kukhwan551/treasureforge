"use server";
// app/api/explore/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page  = parseInt(searchParams.get("page")  ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "12");
  const from  = (page - 1) * limit;

  const admin = createAdminClient();

  const { data, error, count } = await admin
    .from("games")
    .select(`
      id, title, description, difficulty, target_age,
      order_mode, time_limit_sec, share_code,
      compass_assist, created_at,
      reward_expires_at, reward_limit, reward_claimed_count,
      maps ( public_url )
    `, { count: "exact" })
    .eq("is_public", true)
    .not("share_code", "is", null)
    .in("status", ["published"])
    .is("deleted_at", null)
    .order("public_agreed_at", { ascending: false })
    .range(from, from + limit - 1);

  if (error) return NextResponse.json(
    { data: null, error: { message: error.message } }, { status: 500 }
  );

  const now = new Date();
  const enriched = (data ?? []).map((g: Record<string, unknown>) => ({
    ...g,
    is_exhausted:
      (g.reward_expires_at != null && new Date(g.reward_expires_at as string) < now) ||
      (g.reward_limit != null && (g.reward_claimed_count as number ?? 0) >= (g.reward_limit as number)),
  }));

  return NextResponse.json({ data: enriched, count, error: null });
}
