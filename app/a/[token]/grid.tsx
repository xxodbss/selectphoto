"use client";

/* eslint-disable @next/next/no-img-element -- 미리 줄여 둔 썸네일을 그대로 쓴다 */
import { useLayoutEffect, useRef } from "react";
import { photoUrl } from "@/lib/photos";
import type { SharedPhoto } from "./types";

type Props = {
  photos: SharedPhoto[];
  ratings: Record<string, number>;
  currentIndex: number; // 필름스트립에서 보던 사진
  hint: string; // 맨 위 안내 (예: "전체 505장 · 사진을 누르면 …")
  photoNumbers: Map<string, number>; // 전체에서의 원래 번호
  onOpen: (index: number) => void;
};

export function Grid({ photos, ratings, currentIndex, hint, photoNumbers, onOpen }: Props) {
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  // 격자로 돌아오면 보던 사진이 가운데 오게 (처음 그릴 때만)
  useLayoutEffect(() => {
    if (currentIndex > 0) itemRefs.current[currentIndex]?.scrollIntoView({ block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    // 페이지 자체가 스크롤된다 (아이폰 상단 누르면 맨 위로)
    <div className="px-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* 위아래 여백을 같게: 위쪽 막대 아래든 초록 띠 아래든 붙어 보이지 않게 */}
      <p className="px-3 py-3 text-xs text-zinc-400">
        {hint}
      </p>
      <ul className="grid grid-cols-3 gap-1">
        {photos.map((photo, i) => {
          const rating = ratings[photo.id] ?? 0;
          return (
            <li
              key={photo.id}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
            >
              <button
                type="button"
                onClick={() => onOpen(i)}
                className="relative block aspect-square w-full overflow-hidden bg-black/20"
                aria-label={`${photo.filename} 크게 보기${rating ? `, ${rating}점` : ""}`}
                aria-current={i === currentIndex}
              >
                <img
                  src={photoUrl(photo.thumb_path)}
                  alt={photo.filename}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                {/* 전체에서의 원래 사진 번호 */}
                <span className="absolute left-1 top-1 rounded bg-black/50 px-1 py-0.5 text-[10px] leading-none tabular-nums text-zinc-300">
                  {photoNumbers.get(photo.id) ?? i + 1}
                </span>
                {rating > 0 && (
                  <span className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-xs font-semibold text-zinc-300">
                    ★{rating}
                  </span>
                )}
                {/* 방금 보던 사진: 필름스트립 띠처럼 얇은 흰 테두리 */}
                {i === currentIndex && <span className="absolute inset-0 border-[1.5px] border-white" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
