// app/api/photo-missions/verify/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { imageBase64, mediaType, keywords, postId } = body;

  if (!imageBase64 || !keywords) {
    return NextResponse.json({ error: { message: "이미지와 키워드가 필요합니다." } }, { status: 400 });
  }

  const keywordList = keywords.split(",").map((k: string) => k.trim()).filter(Boolean);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType ?? "image/jpeg",
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: `이 이미지를 분석해주세요. 다음 키워드 중 하나라도 이미지에서 확인되는지 판단해주세요: ${keywordList.join(", ")}

반드시 아래 JSON 형식으로만 답변하세요:
{
  "found": true 또는 false,
  "matched_keyword": "일치한 키워드 (없으면 null)",
  "description": "이미지에서 보이는 것에 대한 짧은 설명 (한국어, 1-2문장)"
}`,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "{}";
    
    let result;
    try {
      const clean = text.replace(/```json|```/g, "").trim();
      result = JSON.parse(clean);
    } catch {
      result = { found: false, matched_keyword: null, description: "이미지 분석에 실패했습니다." };
    }

    return NextResponse.json({ data: result, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ data: null, error: { message } }, { status: 500 });
  }
}
