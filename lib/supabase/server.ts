// lib/supabase/server.ts
// 서버(Server Component, Route Handler, Server Action)에서 사용하는
// Supabase 인스턴스. Next.js 15의 비동기 cookies()를 사용합니다.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Route Handler가 아닌 Server Component에서는 set이 불가능.
            // 미들웨어에서 세션을 갱신하므로 여기서 에러를 무시합니다.
          }
        },
      },
    }
  );
}
