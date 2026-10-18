"use client";

import { FILTERS, filterLabel, matchesFilter, type RatingFilter } from "./rating-filter";
import type { SharedPhoto } from "./types";

type Props = {
  photos: SharedPhoto[];
  ratings: Record<string, number>;
  value: RatingFilter;
  onChange: (filter: RatingFilter) => void;
};

// 격자 위 버튼 줄: 누른 점수의 사진만 보기 (좁으면 좌우로 밀기)
export function FilterChips({ photos, ratings, value, onChange }: Props) {
  return (
    <div className="flex gap-1.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
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
