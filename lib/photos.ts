// 저장소 경로 → 누구나 볼 수 있는 사진 주소
export function photoUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${path}`;
}

// 꾹 눌러 저장할 때 원래 파일명으로 저장되는 주소 (Supabase가 저장 이름을 같이 보내 줌)
// 맥 파일명은 한글 자모가 분리돼 있을 수 있어서 완성형(NFC)으로 바꾼다
export function photoUrlWithName(path: string, filename: string) {
  return `${photoUrl(path)}?download=${encodeURIComponent(filename.normalize("NFC"))}`;
}
