"use client";

import { FILTERS, filterLabel, matchesFilter, type RatingFilter } from "./rating-filter";
type Props = {
  photos: { id: string }[];
  ratings: Record<string, number>;
  value: RatingFilter;
  onChange: (filter: RatingFilter) => void;
  className?: string; // 양옆 여백 (작가 화면 PC는 더 넓게)
};

// 격자 위 버튼 줄: 누른 점수의 사진만 보기 (좁으면 좌우로 밀기) — 작가 화면 사진 목록에서도 같이 쓴다
export function FilterChips({ photos, ratings, value, onChange, className = "px-4" }: Props) {
  return (
    <div className={`flex gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none] ${className}`}>
      {FILTERS.map((filter) => {
        const count = photos.filter((p) => matchesFilter(ratings[p.id] ?? 0, filter)).length;
        const selected = filter === value;
        return (
          <button
            key={String(filter)}
            type="button"
            onClick={() => onChange(filter)}
            aria-pressed={selected}
            className={`flex-none rounded-full px-3 py-1 text-xs tabular-nums ${
              selected ? "bg-zinc-100 font-semibold text-zinc-900" : "border border-zinc-600 text-zinc-300"
            }`}
          >
            {filterLabel(filter)} <span className={selected ? "" : "text-zinc-500"}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
