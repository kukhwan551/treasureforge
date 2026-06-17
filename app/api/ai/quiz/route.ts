// app/api/ai/quiz/route.ts
// OpenRouter를 통한 Claude API 호출
// Anthropic 직접 호출 대신 OpenRouter 중계 서비스 사용

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("[AI Quiz API] OPENROUTER_API_KEY not set");
      return NextResponse.json(
        { error: "API 키가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    console.log("[AI Quiz API] Calling OpenRouter, model:", body.model);

    // OpenRouter는 OpenAI 호환 형식 사용
    // system 프롬프트를 messages 배열 첫 번째로 변환
    const messages = [
      ...(body.system ? [{ role: "system", content: body.system }] : []),
      ...(body.messages ?? []),
    ];

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer":  "https://treasureforge.local", // 사이트 식별용
        "X-Title":       "TreasureForge AI",
      },
      body: JSON.stringify({
        model:      "anthropic/claude-sonnet-4-6", // OpenRouter 모델 ID
        messages,
        max_tokens: body.max_tokens ?? 2000,
      }),
    });

    const responseText = await res.text();
    console.log("[AI Quiz API] Status:", res.status);

    if (!res.ok) {
      console.error("[AI Quiz API] Error body:", responseText);
      return NextResponse.json(
        { error: `OpenRouter API 오류: ${res.status}`, detail: responseText },
        { status: res.status }
      );
    }

    // OpenRouter 응답을 Anthropic 형식으로 변환
    // OpenRouter: { choices: [{ message: { content: "..." } }] }
    // Anthropic:  { content: [{ type: "text", text: "..." }] }
    const data = JSON.parse(responseText);
    const text = data.choices?.[0]?.message?.content ?? "";

    console.log("[AI Quiz API] Success, response length:", text.length);

    // AiQuizGenerator.tsx가 기대하는 Anthropic 형식으로 변환
    return NextResponse.json({
      content: [{ type: "text", text }],
    });

  } catch (err) {
    console.error("[AI Quiz API] Unexpected error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다.", detail: String(err) },
      { status: 500 }
    );
  }
}
