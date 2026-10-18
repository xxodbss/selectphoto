export function StatusBadge({ submitted }: { submitted: boolean }) {
  return submitted ? (
    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
      제출됨
    </span>
  ) : (
    <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600">
      셀렉 중
    </span>
  );
}
