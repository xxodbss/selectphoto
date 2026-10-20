// 작가 화면 공통 색·모양 — 모델 화면과 같은 규칙
// (브릿지 회색 바탕, 밝은 글자, 흰 주 버튼, 회색 테두리 보조 버튼, 경고는 노랑)
export const ui = {
  muted: "text-zinc-400", // 보조 글자 (모델 화면 파일명 색)
  divider: "border-black/30", // 구분선 (모델 화면 위쪽 막대 아래 선)
  input:
    "rounded-lg border border-zinc-600 bg-black/20 px-3 py-3 text-base text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-300 focus:outline-none",
  primary: "rounded-lg bg-zinc-100 py-3 font-semibold text-zinc-900 disabled:opacity-50", // 모델 화면 "다 골랐어요"
  secondary: "rounded-lg border border-zinc-500 py-3 text-sm text-zinc-200 disabled:opacity-40",
  pill: "rounded-full border border-zinc-500 px-3 py-1 text-xs text-zinc-200 disabled:opacity-40", // 모델 화면 "격자로 보기"
  error: "text-sm text-red-400",
  warning: "text-sm text-amber-400", // 모델 화면 5점 한도 안내
};
