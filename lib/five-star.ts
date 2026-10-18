// 실제로 적용되는 5점 한도 (데이터베이스의 effective_five_star_limit과 같은 규칙)
// 작가가 정하지 않았으면(null) 사진 장수의 10% 올림, 최소 1장
export function effectiveFiveStarLimit(limit: number | null, photoCount: number) {
  return limit ?? Math.max(1, Math.ceil(photoCount / 10));
}
