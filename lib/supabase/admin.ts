// lib/supabase/admin.ts
// Service Role 키를 사용하는 관리자 클라이언트
// RLS를 우회하므로 서버 사이드(Route Handler, Server Action)에서만 사용할 것
// 절대 클라이언트 컴포넌트에서 import 금지

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다."
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  });
}
