// app/api/templates/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

async function verifyOwner(userId: string, templateId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("templates")
    .select("owner_id")
    .eq("id", templateId)
    .single();
  return data?.owner_id === userId;
}

// GET: 단건 조회
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("templates")
    .select(`*, template_posts(*)`)
    .eq("id", id)
    .single();
  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 404 });
  return NextResponse.json({ data, error: null });
}

// DELETE: 템플릿 삭제
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { message: "Unauthorized" } }, { status: 401 });

  const isOwner = await verifyOwner(user.id, id);
  if (!isOwner) return NextResponse.json({ data: null, error: { message: "Forbidden" } }, { status: 403 });

  const admin = createAdminClient();
  const { error } = await admin.from("templates").delete().eq("id", id);
  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 });
  return NextResponse.json({ data: { id }, error: null });
}
