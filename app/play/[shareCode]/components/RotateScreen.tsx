"use client";

// app/play/[shareCode]/components/RotateScreen.tsx
// 세로 모드에서 가로로 돌리도록 안내하는 화면

export default function RotateScreen({ gameTitle }: { gameTitle: string }) {
  return (
    <div className="fixed inset-0 z-[100] bg-[#0f0f10] flex flex-col
      items-center justify-center gap-6 px-8 text-center">

      {/* 회전 애니메이션 아이콘 */}
      <div className="relative">
        <div className="text-6xl animate-bounce">📱</div>
        <div className="absolute -right-4 -top-2 text-3xl animate-spin"
          style={{ animationDuration: "2s" }}>
          ↻
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="space-y-2">
        <p className="text-xl font-bold text-[#e8e4d9]">
          화면을 가로로 돌려주세요
        </p>
        <p className="text-sm text-[#7a756c]">
          {gameTitle} 탐험은 가로 모드에서 즐길 수 있습니다
        </p>
      </div>

      {/* 시각적 가이드 */}
      <div className="flex items-center gap-4 mt-2">
        {/* 세로 폰 */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-14 rounded-lg border-2 border-[#3a3830]
            flex items-center justify-center opacity-40">
            <div className="w-4 h-1 bg-[#3a3830] rounded"/>
          </div>
          <span className="text-[10px] text-[#3a3830]">세로</span>
        </div>

        {/* 화살표 */}
        <div className="text-2xl text-[#b89a5a] animate-pulse">→</div>

        {/* 가로 폰 */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-14 h-8 rounded-lg border-2 border-[#b89a5a]
            flex items-center justify-center">
            <div className="h-4 w-1 bg-[#b89a5a] rounded"/>
          </div>
          <span className="text-[10px] text-[#b89a5a] font-medium">가로 ✓</span>
        </div>
      </div>

      {/* 최적 이미지 안내 (관리자용) */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-[10px] text-[#2a2924]">
          권장 지도 이미지 비율: 16:9 (1920×1080)
        </p>
      </div>
    </div>
  );
}
