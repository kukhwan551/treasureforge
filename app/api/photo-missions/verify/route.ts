// app/api/photo-missions/verify/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { imageBase64, mediaType, keywords } = body;

  if (!imageBase64) {
    return NextResponse.json({ error: { message: "이미지가 필요합니다." } }, { status: 400 });
  }
  if (!keywords || !keywords.trim()) {
    return NextResponse.json({ data: { found: false, matched_keyword: null, description: "키워드가 설정되지 않았습니다. 게임 제작자에게 문의해주세요." }, error: null });
  }

  const keywordList = keywords.split(",").map((k: string) => k.trim()).filter(Boolean);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY ?? ""}`,
        "HTTP-Referer": "https://treasureforge.vercel.app",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4-5",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mediaType ?? "image/jpeg"};base64,${imageBase64}`,
                },
              },
              {
                type: "text",
                text: `이 이미지를 분석해주세요. 다음 키워드 중 하나라도 이미지에서 확인되는지 판단해주세요: ${keywordList.join(", ")}

반드시 아래 JSON 형식으로만 답변하세요. 다른 텍스트는 절대 포함하지 마세요:
{"found":true,"matched_keyword":"일치한 키워드","description":"설명"}
또는
{"found":false,"matched_keyword":null,"description":"설명"}`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter API 오류:", response.status, errText);
      return NextResponse.json({ data: { found: false, matched_keyword: null, description: "AI 분석 서비스 오류가 발생했습니다." }, error: null });
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content ?? "";
    console.log("AI 원본 응답:", rawText);

    let result;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("JSON 없음");
      result = JSON.parse(jsonMatch[0]);
      if (typeof result.found !== "boolean") throw new Error("found 필드 없음");
    } catch (parseErr) {
      console.error("JSON 파싱 실패. 원본:", rawText, "오류:", parseErr);
      result = { found: false, matched_keyword: null, description: "이미지 분석 결과를 읽지 못했습니다. 다시 시도해주세요." };
    }

    return NextResponse.json({ data: result, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "서버 오류";
    console.error("verify 오류:", message);
    return NextResponse.json({ data: null, error: { message } }, { status: 500 });
  }
}
