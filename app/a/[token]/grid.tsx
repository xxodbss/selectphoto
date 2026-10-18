"use client";

/* eslint-disable @next/next/no-img-element -- 미리 줄여 둔 썸네일을 그대로 쓴다 */
import { photoUrl } from "@/lib/photos";
import type { SharedPhoto } from "./types";

type Props = {
  photos: SharedPhoto[];
  ratings: Record<string, number>;
  onOpen: (index: number) => void;
};

export function Grid({ photos, ratings, onOpen }: Props) {
  return (
    // 격자만 안쪽에서 위아래로 스크롤 (사진이 많을 때 다 보려면 필요)
    // 아래 여백: 떠 있는 "다 골랐어요" 버튼이 마지막 줄 사진을 가리지 않게
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-28">
      <p className="px-3 pb-3 text-xs text-zinc-400">
        셀렉은 한 사람만 해 주세요. 사진을 누르면 크게 보고 별점을 매길 수 있어요.
      </p>
      <ul className="grid grid-cols-3 gap-1">
        {photos.map((photo, i) => {
          const rating = ratings[photo.id] ?? 0;
          return (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => onOpen(i)}
                className="relative block aspect-square w-full overflow-hidden bg-black/20"
                aria-label={`${photo.filename} 크게 보기${rating ? `, ${rating}점` : ""}`}
              >
                <img
                  src={photoUrl(photo.thumb_path)}
                  alt={photo.filename}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                {rating > 0 && (
                  <span className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-xs font-semibold text-zinc-300">
                    ★{rating}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
