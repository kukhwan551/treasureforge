"use client";

// components/auth/LogoutButton.tsx
// 어느 페이지에서든 가져다 쓸 수 있는 로그아웃 버튼

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton({
  className,
}: {
  className?: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className={
        className ??
        `rounded-lg border border-[#2a2924] px-3 py-1.5 text-xs text-[#7a756c]
        hover:border-[#3a3830] hover:text-[#9a9590]
        disabled:opacity-50 transition-colors`
      }
    >
      {isPending ? "로그아웃 중…" : "로그아웃"}
    </button>
  );
}
