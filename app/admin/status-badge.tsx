export function StatusBadge({ submitted }: { submitted: boolean }) {
  return submitted ? (
    // 모델 화면 "셀렉을 마친 앨범이에요" 초록 띠와 같은 초록
    <span className="flex-none rounded-full bg-emerald-900/60 px-2 py-1 text-xs font-semibold text-emerald-100">
      셀렉 완료
    </span>
  ) : (
    <span className="flex-none rounded-full border border-zinc-600 px-2 py-1 text-xs text-zinc-300">
      셀렉 중
    </span>
  );
}
