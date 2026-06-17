// app/auth/confirm/route.ts
// Supabase 이메일 인증 콜백 처리
// 가입 확인 이메일의 링크를 클릭하면 이 Route Handler로 도달합니다.
// code를 세션으로 교환한 뒤 /games로 이동합니다.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/games";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 인증 성공 → 대상 페이지로 이동
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 인증 실패 → 에러 메시지와 함께 로그인 페이지로
  return NextResponse.redirect(
    `${origin}/login?error=인증+링크가+만료되었습니다.+다시+시도해+주세요.`
  );
}
