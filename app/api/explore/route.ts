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

  return NextResponse.json({ data, count, error: null });
}
