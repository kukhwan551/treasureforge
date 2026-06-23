"use client";
// components/photo/PhotoMissionPopup.tsx

import { useState, useRef } from "react";
import type { PostWithQuiz } from "@/types/explore";

interface PhotoMissionPopupProps {
  post: PostWithQuiz;
  seniorMode: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export default function PhotoMissionPopup({
  post, seniorMode, onComplete, onSkip,
}: PhotoMissionPopupProps) {
  const [status, setStatus]       = useState<"idle"|"uploading"|"checking"|"pass"|"fail">("idle");
  const [preview, setPreview]     = useState<string | null>(null);
  const [message, setMessage]     = useState("");
  const [imageData, setImageData] = useState<{base64:string; mediaType:string} | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pm = post.post_photo_missions?.[0];

  const guideText = pm?.guide_text || "이 장소에서 사진을 찍어 인증해주세요.";
  const keywords  = pm?.keywords   || "";
  const ts = seniorMode ? "text-xl" : "text-base";
  const th = seniorMode ? "text-2xl" : "text-lg";

  function handleFile(file: File) {
    if (!file) return;
    setStatus("uploading");
    const r1 = new FileReader();
    r1.onload = e => setPreview(e.target?.result as string);
    r1.readAsDataURL(file);
    const r2 = new FileReader();
    r2.onload = e => {
      const dataUrl = e.target?.result as string;
      setImageData({ base64: dataUrl.split(",")[1], mediaType: file.type });
      setStatus("idle");
    };
    r2.readAsDataURL(file);
  }

  async function handleVerify() {
    if (!imageData) return;
    setStatus("checking"); setMessage("");
    // 키워드 디버깅: 키워드가 없으면 사용자에게 바로 알림
    if (!keywords || !keywords.trim()) {
      setStatus("fail");
      setMessage("인증샷 키워드가 설정되지 않았습니다. 게임 관리자에게 문의해주세요.");
      return;
    }
    try {
      const res  = await fetch("/api/photo-missions/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: imageData.base64, mediaType: imageData.mediaType, keywords }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      const result = json.data;
      if (result.found) {
        setStatus("pass");
        setMessage(result.description || "인증 성공!");
        setTimeout(() => onComplete(), 1500);
      } else {
        setStatus("fail");
        setMessage(result.description || "사진에서 인증 정보를 찾을 수 없습니다. 다시 시도해주세요.");
      }
    } catch (err) {
      setStatus("fail");
      setMessage(err instanceof Error ? err.message : "오류가 발생했습니다.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0f0f10]/95 px-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <p className="text-3xl mb-2">📸</p>
          <h2 className={`font-bold text-[#e8e4d9] ${th}`}>{post.name}</h2>
          <p className={`text-[#7a756c] mt-1 ${ts}`}>{guideText}</p>
        </div>

        <div onClick={() => inputRef.current?.click()}
          className={`relative rounded-2xl border-2 border-dashed cursor-pointer
            flex flex-col items-center justify-center transition-all
            ${preview ? "border-[#b89a5a]/50" : "border-[#2a2924] hover:border-[#b89a5a]/30"}
            ${seniorMode ? "h-56" : "h-44"}`}>
          {preview
            ? <img src={preview} alt="인증샷" className="w-full h-full object-cover rounded-2xl"/>
            : (<><span className="text-4xl mb-2">🖼️</span>
               <p className={`text-[#5a5650] ${seniorMode ? "text-base" : "text-xs"}`}>탭하여 사진 선택 또는 촬영</p></>)
          }
          {status === "checking" && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0f0f10]/70 rounded-2xl">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#b89a5a] border-t-transparent mx-auto mb-2"/>
                <p className="text-xs text-[#b89a5a]">AI 분석 중...</p>
              </div>
            </div>
          )}
          {status === "pass" && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0f0f10]/70 rounded-2xl">
              <p className="text-5xl">✅</p>
            </div>
          )}
        </div>

        <input ref={inputRef} type="file" accept="image/*" capture="environment"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}/>

        {message && (
          <div className={`rounded-xl px-4 py-3 text-sm text-center
            ${status === "pass"
              ? "bg-[#4a9d6f]/15 border border-[#4a9d6f]/30 text-[#4a9d6f]"
              : "bg-[#e07070]/10 border border-[#e07070]/20 text-[#e07070]"}`}>
            {message}
          </div>
        )}

        <div className="space-y-2">
          {imageData && status !== "checking" && status !== "pass" && (
            <button onClick={handleVerify}
              className={`w-full rounded-xl bg-[#b89a5a] font-bold text-[#0f0f10]
                hover:bg-[#c9aa6a] transition-colors ${seniorMode ? "py-5 text-xl" : "py-3 text-base"}`}>
              ✨ 인증하기
            </button>
          )}
          {!imageData && (
            <button onClick={() => inputRef.current?.click()}
              className={`w-full rounded-xl bg-[#b89a5a] font-bold text-[#0f0f10]
                hover:bg-[#c9aa6a] transition-colors ${seniorMode ? "py-5 text-xl" : "py-3 text-base"}`}>
              📷 사진 찍기 / 선택
            </button>
          )}
          <button onClick={onSkip}
            className={`w-full rounded-xl border border-[#2a2924] font-medium
              text-[#7a756c] hover:border-[#3a3830] transition-colors ${seniorMode ? "py-5 text-xl" : "py-3 text-sm"}`}>
            나중에 하기
          </button>
        </div>
      </div>
    </div>
  );
}
