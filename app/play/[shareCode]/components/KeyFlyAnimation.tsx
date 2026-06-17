"use client";

// app/play/[shareCode]/components/KeyFlyAnimation.tsx
// 황금열쇠가 포스트 핀 위치에서 HUD 열쇠 카운터로 날아가는 애니메이션

import { useEffect, useRef, useState } from "react";

interface KeyFlyAnimationProps {
  active: boolean;
  fromX: number;  // 0~100% (포스트 핀 위치)
  fromY: number;
  onComplete: () => void;
}

export default function KeyFlyAnimation({
  active, fromX, fromY, onComplete,
}: KeyFlyAnimationProps) {
  const [pos, setPos] = useState({ x: fromX, y: fromY });
  const [scale, setScale] = useState(1.5);
  const [opacity, setOpacity] = useState(1);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }

    // HUD 열쇠 위치 (우측 상단 고정)
    const targetX = 85;
    const targetY = 3;

    setPos({ x: fromX, y: fromY });
    setScale(2);
    setOpacity(1);
    setVisible(true);

    // 애니메이션: 포스트 위치 → HUD
    timerRef.current = setTimeout(() => {
      setPos({ x: targetX, y: targetY });
      setScale(0.5);
      setOpacity(0);
    }, 50);

    timerRef.current = setTimeout(() => {
      setVisible(false);
      onComplete();
    }, 1100);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active]); // eslint-disable-line

  if (!visible) return null;

  return (
    <div
      className="fixed pointer-events-none"
      style={{
        left:       `${pos.x}%`,
        top:        `${pos.y}%`,
        transform:  `translate(-50%, -50%) scale(${scale})`,
        opacity,
        transition: "all 1s cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex:     110,
        fontSize:   "2rem",
        filter:     "drop-shadow(0 0 8px #b89a5a)",
      }}
    >
      🗝
    </div>
  );
}
