// 저장소 경로 → 누구나 볼 수 있는 사진 주소
export function photoUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${path}`;
}
