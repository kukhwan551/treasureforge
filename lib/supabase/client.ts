// lib/supabase/client.ts
// 브라우저(Client Component)에서 사용하는 Supabase 인스턴스
// 세션 쿠키를 자동으로 읽고 갱신합니다.

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
