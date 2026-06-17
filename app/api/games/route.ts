// app/api/games/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { nanoid } from "nanoid";

const createSchema = z.object({
  title:          z.string().min(1).max(100),
  description:    z.string().max(500).nullable().optional(),
  difficulty:     z.enum(["easy", "medium", "hard"]).optional(),
  target_age:     z.enum(["child", "teen", "adult", "senior", "all"]).optional(),
  status:         z.enum(["draft", "private", "published", "archived"]).optional(),
  order_mode:     z.enum(["free", "sequential"]).optional(),
  entry_code:     z.string().nullable().optional(),
  time_limit_sec: z.number().int().nullable().optional(),
  reward_message: z.string().nullable().optional(),
  reward_type:    z.enum(["message", "coupon", "certificate"]).optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log("[GET /api/games] Unauthorized");
    return NextResponse.json({ data: null, error: { message: "Unauthorized" } }, { status: 401 });
  }

  console.log("[GET /api/games] user.id:", user.id);

  const { searchParams } = new URL(req.url);
  const page   = Number(searchParams.get("page")  ?? 1);
  const limit  = Number(searchParams.get("limit") ?? 20);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const offset = (page - 1) * limit;

  // ★ admin으로 조회 (RLS 우회) + owner_id 필터는 코드에서 처리
  const admin = createAdminClient();
  let query = admin
    .from("games")
    .select("*", { count: "exact" })
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) query = query.ilike("title", `%${search}%`);
  if (status) query = query.eq("status", status);

  const { data, count, error } = await query;
  
  console.log("[GET /api/games] count:", count, "error:", error?.message);
  
  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 });

  return NextResponse.json({ data: { games: data ?? [], total: count ?? 0 }, error: null });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { message: "Unauthorized" } }, { status: 401 });

  console.log("[POST /api/games] user.id:", user.id);

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ data: null, error: { message: "잘못된 요청" } }, { status: 400 }); }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { message: parsed.error.issues[0].message } },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const insertData = {
    ...parsed.data,
    owner_id:   user.id,
    share_code: nanoid(8),
    status:     parsed.data.status ?? "draft",
  };
  
  console.log("[POST /api/games] inserting with owner_id:", insertData.owner_id);

  const { data, error } = await admin
    .from("games")
    .insert(insertData)
    .select("*")
    .single();

  if (error) {
    console.error("[createGame] error:", error);
    return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 });
  }
  
  console.log("[createGame] created id:", data?.id, "owner_id:", data?.owner_id);
  return NextResponse.json({ data, error: null }, { status: 201 });
}
