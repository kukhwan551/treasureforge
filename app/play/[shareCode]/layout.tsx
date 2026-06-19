// app/play/[shareCode]/layout.tsx
// 게임별 동적 OG 태그 (카카오톡, SNS 공유 미리보기)
import type { Metadata } from "next";

type Props = {
  params: Promise<{ shareCode: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareCode } = await params;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/games?share_code=eq.${shareCode}&status=in.(published,private)&select=title,description,map_url&limit=1`,
      {
        headers: {
          apikey:        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""}`,
        },
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) throw new Error("fetch failed");
    const [game] = await res.json();
    if (!game) throw new Error("not found");

    const title       = `${game.title} — TreasureForge AI`;
    const description = game.description ?? "지도 위에서 펼쳐지는 보물찾기 게임에 참여하세요!";
    const imageUrl    = game.map_url ?? "https://treasureforge.vercel.app/og-default.png";

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://treasureforge.vercel.app/play/${shareCode}`,
        siteName: "TreasureForge AI",
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: game.title,
          },
        ],
        locale: "ko_KR",
        type: "website",
      },
    };
  } catch {
    return {
      title: "보물찾기 게임 — TreasureForge AI",
      description: "지도 위에서 펼쳐지는 보물찾기 게임에 참여하세요!",
    };
  }
}

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
