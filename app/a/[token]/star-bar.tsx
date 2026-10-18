"use client";

import { useRef, useState } from "react";
import type { RateMode } from "./use-ratings";

const MOVE_THRESHOLD = 6; // 이보다 많이 움직이면 탭이 아니라 슬라이드

type Props = {
  value: number;
  disabled: boolean;
  onRate: (stars: number, mode: RateMode) => void;
};

// 별 5개: 탭하면 그 점수(같은 별 다시 탭 = 취소), 밀면 손을 뗀 위치의 점수
// 안 고른 칸은 ∗, 고른 칸은 회색 별이 찬다
export function StarBar({ value, disabled, onRate }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startStar: number; moved: boolean } | null>(null);
  const [preview, setPreview] = useState<number | null>(null);

  // 손가락 위치 → 별 개수 (첫 별보다 왼쪽이면 0)
  function starAt(clientX: number) {
    const rect = barRef.current!.getBoundingClientRect();
    if (clientX < rect.left) return 0;
    return Math.min(5, Math.max(1, Math.ceil(((clientX - rect.left) / rect.width) * 5)));
  }

  function end(e: React.PointerEvent) {
    const d = drag.current;
    drag.current = null;
    setPreview(null);
    if (!d) return;
    if (d.moved) onRate(starAt(e.clientX), "set");
    else if (d.startStar > 0) onRate(d.startStar, "toggle");
  }

  const shown = preview ?? value;

  return (
    <div
      ref={barRef}
      role="radiogroup"
      aria-label="별점"
      onPointerDown={(e) => {
        if (disabled) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { startX: e.clientX, startStar: starAt(e.clientX), moved: false };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        if (!d.moved && Math.abs(e.clientX - d.startX) < MOVE_THRESHOLD) return;
        d.moved = true;
        setPreview(starAt(e.clientX));
      }}
      onPointerUp={end}
      onPointerCancel={() => {
        drag.current = null;
        setPreview(null);
      }}
      className="mx-auto flex w-fit flex-none touch-none select-none"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n}점`}
          disabled={disabled}
          // 손가락·마우스는 위에서 처리하고, 키보드로 누를 때만 여기서 처리
          onClick={(e) => {
            if (e.detail === 0) onRate(n, "toggle");
          }}
          className={`flex h-10 w-9 items-center justify-center text-xl leading-none disabled:opacity-60 ${
            n <= shown ? "text-zinc-300" : "text-zinc-500"
          }`}
        >
          {n <= shown ? "★" : "∗"}
        </button>
      ))}
    </div>
  );
}
