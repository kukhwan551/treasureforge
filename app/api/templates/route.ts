// app/api/templates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET: 내 템플릿 목록
export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { message: "Unauthorized" } }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("templates")
    .select(`
      id, title, description, difficulty, target_age,
      order_mode, time_limit_sec, entry_code,
      reward_message, reward_type, compass_assist,
      is_public, created_at,
      template_posts (
        id, name, description, order_index, order_mode,
        mission_type, time_limit_sec, score,
        hint_1, hint_2, hint_3
      )
    `)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 });
  return NextResponse.json({ data, error: null });
}

// POST: 템플릿 생성 (게임에서 저장)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { message: "Unauthorized" } }, { status: 401 });

  const body = await req.json();
  const { posts, ...templateData } = body;

  const admin = createAdminClient();

  // 템플릿 생성
  const { data: template, error: tErr } = await admin
    .from("templates")
    .insert({ ...templateData, owner_id: user.id })
    .select("*")
    .single();

  if (tErr || !template) return NextResponse.json({ data: null, error: { message: tErr?.message ?? "생성 실패" } }, { status: 500 });

  // 포스트 뼈대 저장
  if (posts && posts.length > 0) {
    const postRows = posts.map((p: Record<string, unknown>, i: number) => ({
      template_id:    template.id,
      name:           p.name,
      description:    p.description ?? null,
      order_index:    i,
      order_mode:     p.order_mode ?? "free",
      mission_type:   p.mission_type ?? "quiz",
      time_limit_sec: p.time_limit_sec ?? null,
      score:          p.score ?? 10,
      hint_1:         p.hint_1 ?? null,
      hint_2:         p.hint_2 ?? null,
      hint_3:         p.hint_3 ?? null,
    }));
    const { error: pErr } = await admin.from("template_posts").insert(postRows);
    if (pErr) console.error("[template_posts insert]", pErr);
  }

  // 전체 반환
  const { data: full } = await admin
    .from("templates")
    .select(`*, template_posts(*)`)
    .eq("id", template.id)
    .single();

  return NextResponse.json({ data: full, error: null }, { status: 201 });
}
