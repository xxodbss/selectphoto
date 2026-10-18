"use client";

import { useState } from "react";
import type { RatingsApi } from "./use-ratings";

type Props = {
  ratings: RatingsApi;
  fiveStarLimit: number;
  onClose: () => void;
  onDone: () => void;
};

// "다 골랐어요" 마지막 확인 창
export function FinishSheet({ ratings, fiveStarLimit, onClose, onDone }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const values = Object.values(ratings.ratings);
  const count = (stars: number) => values.filter((r) => r === stars).length;
  const remainingFive = fiveStarLimit - ratings.fiveCount;

  async function confirm() {
    setBusy(true);
    setError(null);
    const result = await ratings.finish();
    setBusy(false);
    if (result === "ok") onDone();
    else if (result === "save-failed") setError("별점이 아직 저장되지 않았어요. 인터넷을 확인하고 다시 눌러 주세요.");
    else setError("잠시 후 다시 눌러 주세요.");
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/50" onClick={busy ? undefined : onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full flex-col gap-3 rounded-t-2xl bg-zinc-800 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <h2 className="text-lg font-bold">셀렉을 마칠까요?</h2>

        <div className="flex flex-col gap-1 text-sm">
          <p>
            ★5 <b>{ratings.fiveCount}장</b> <span className="text-zinc-400">(최대 {fiveStarLimit}장)</span>
            {remainingFive > 0 && (
              <span className="text-zinc-400"> · 5점을 {remainingFive}장 더 고를 수 있어요</span>
            )}
          </p>
          <p className="text-zinc-300">
            {[4, 3, 2, 1].map((s) => `★${s} ${count(s)}장`).join(" · ")}
          </p>
          <p className="text-zinc-400">안 고른 사진 {count(0)}장</p>
        </div>

        <p className="text-sm text-zinc-400">마치면 별점을 더 바꿀 수 없어요.</p>
        {error && (
          <p role="alert" className="text-sm text-amber-400">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-lg border border-zinc-500 py-3 disabled:opacity-50"
          >
            더 고를게요
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="flex-1 rounded-lg bg-zinc-100 py-3 font-semibold text-zinc-900 disabled:opacity-50"
          >
            {busy ? "마치는 중…" : "다 골랐어요"}
          </button>
        </div>
      </div>
    </div>
  );
}
