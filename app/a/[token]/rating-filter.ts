// 별점 골라 보기: 전체, 고른 사진(1–5점), 점수 하나(0 = 안 고름)
export type RatingFilter = "all" | "rated" | 0 | 1 | 2 | 3 | 4 | 5;

export const FILTERS: RatingFilter[] = ["all", "rated", 5, 4, 3, 2, 1, 0];

export function matchesFilter(rating: number, filter: RatingFilter) {
  if (filter === "all") return true;
  if (filter === "rated") return rating > 0;
  return rating === filter;
}

export function filterLabel(filter: RatingFilter) {
  if (filter === "all") return "전체";
  if (filter === "rated") return "고른 사진";
  if (filter === 0) return "안 고름";
  return `★${filter}`;
}
