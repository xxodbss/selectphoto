"use client";

import { useState } from "react";
import type { RatingsApi } from "./use-ratings";

type Props = {
  ratings: RatingsApi;
  fiveStarLimit: number;
  onClose: () => void;
  onDone: () => void;
};

// "다 골랐어요" 마지막 확인: 아래에서 올라오는 납작한 표 (점수마다 한 줄)
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
    // 모델 화면과 같은 폭으로 아래에 붙는다 (PC에서도 가운데 휴대폰 폭)
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50" onClick={busy ? undefined : onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[480px] flex-col gap-4 border-t border-zinc-600 bg-bridge px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-zinc-100"
      >
        <h2 className="text-lg font-bold">셀렉을 마칠까요?</h2>

        <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-2 tabular-nums">
          {[5, 4, 3, 2, 1].map((stars) => (
            <div key={stars} className="contents">
              <dt className={`tracking-[0.15em] ${stars === 5 ? "text-base" : "text-sm"}`}>
                <span className="text-zinc-300">{"★".repeat(stars)}</span>
                <span className="text-zinc-500">{"∗".repeat(5 - stars)}</span>
              </dt>
              <dd className={`text-right ${stars === 5 ? "text-base font-semibold" : "text-sm text-zinc-300"}`}>
                {count(stars)}장
                {stars === 5 && <span className="ml-1 text-xs font-normal text-zinc-400">/ 최대 {fiveStarLimit}</span>}
              </dd>
            </div>
          ))}
          <div className="col-span-2 border-t border-zinc-600" />
          <dt className="text-sm text-zinc-400">안 고름</dt>
          <dd className="text-right text-sm text-zinc-400">{count(0)}장</dd>
        </dl>

        <div className="flex flex-col gap-1 text-sm text-zinc-400">
          {remainingFive > 0 && <p>5점을 {remainingFive}장 더 고를 수 있어요.</p>}
          <p>마치면 별점을 더 바꿀 수 없어요.</p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-amber-400">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 py-3 text-sm text-zinc-300 disabled:opacity-50"
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
