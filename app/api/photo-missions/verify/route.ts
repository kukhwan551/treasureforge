// app/api/photo-missions/verify/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { imageBase64, mediaType, keywords, hintImageUrl } = body;

  if (!imageBase64) {
    return NextResponse.json({ error: { message: "이미지가 필요합니다." } }, { status: 400 });
  }

  // 확인이미지와 키워드 둘 다 없으면 오류
  if ((!keywords || !keywords.trim()) && !hintImageUrl) {
    return NextResponse.json({
      data: { found: false, matched_keyword: null, description: "인증 기준이 설정되지 않았습니다. 게임 제작자에게 문의해주세요." },
      error: null
    });
  }

  const keywordList = keywords ? keywords.split(",").map((k: string) => k.trim()).filter(Boolean) : [];

  // 프롬프트 결정
  let promptText = "";
  if (hintImageUrl && keywordList.length > 0) {
    promptText = `첫 번째 이미지는 참여자가 촬영한 사진이고, 두 번째 이미지는 기준 이미지입니다.
두 이미지의 유사성을 0~100% 로 판단하세요 (같은 장소/피사체면 높은 점수).
또한 촬영 사진에서 다음 키워드도 확인해주세요: ${keywordList.join(", ")}

반드시 아래 JSON 형식으로만 답변하세요:
{"found":true,"matched_keyword":"일치한 키워드 또는 이미지유사","similarity":75,"description":"설명"}
또는
{"found":false,"matched_keyword":null,"similarity":20,"description":"설명"}

similarity가 30 이상이거나 키워드가 발견되면 found를 true로 설정하세요.`;
  } else if (hintImageUrl) {
    promptText = `첫 번째 이미지는 참여자가 촬영한 사진이고, 두 번째 이미지는 기준 이미지입니다.
두 이미지의 유사성을 0~100% 로 판단하세요 (같은 장소/피사체면 높은 점수).

반드시 아래 JSON 형식으로만 답변하세요:
{"found":true,"matched_keyword":"이미지유사","similarity":75,"description":"설명"}
또는
{"found":false,"matched_keyword":null,"similarity":20,"description":"설명"}

similarity가 30 이상이면 found를 true로 설정하세요.`;
  } else {
    promptText = `이 이미지를 분석해주세요. 다음 키워드 중 하나라도 이미지에서 확인되는지 판단해주세요: ${keywordList.join(", ")}

반드시 아래 JSON 형식으로만 답변하세요:
{"found":true,"matched_keyword":"일치한 키워드","description":"설명"}
또는
{"found":false,"matched_keyword":null,"description":"설명"}`;
  }

  // 메시지 content 구성
  const contentItems: object[] = [
    {
      type: "image_url",
      image_url: { url: `data:${mediaType ?? "image/jpeg"};base64,${imageBase64}` },
    },
  ];
  if (hintImageUrl) {
    contentItems.push({ type: "image_url", image_url: { url: hintImageUrl } });
  }
  contentItems.push({ type: "text", text: promptText });

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
        messages: [{ role: "user", content: contentItems }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter API 오류:", response.status, errText);
      return NextResponse.json({
        data: { found: false, matched_keyword: null, description: "AI 분석 서비스 오류가 발생했습니다." },
        error: null
      });
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
      console.error("JSON 파싱 실패:", rawText, parseErr);
      result = { found: false, matched_keyword: null, description: "이미지 분석 결과를 읽지 못했습니다." };
    }

    return NextResponse.json({ data: result, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ data: null, error: { message } }, { status: 500 });
  }
}
