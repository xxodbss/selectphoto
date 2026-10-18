"use client";

import { useState, useTransition } from "react";
import { effectiveFiveStarLimit } from "@/lib/five-star";
import { setFiveStarLimit } from "./actions";

type Props = {
  albumId: string;
  limit: number | null; // null = 사진 장수의 10%
  photoCount: number;
  fiveCount: number; // 모델이 지금까지 준 5점 장수
};

// 5점 최대 장수: 기본은 10%, 작가가 직접 정하거나 10%로 되돌릴 수 있다
export function LimitEditor({ albumId, limit, photoCount, fiveCount }: Props) {
  const effective = effectiveFiveStarLimit(limit, photoCount);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(effective));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(next: number | null) {
    startTransition(async () => {
      const result = await setFiveStarLimit(albumId, next);
      if (result.error) setError(result.error);
      else {
        setError(null);
        setEditing(false);
      }
    });
  }

  if (!editing) {
    return (
      <div className="flex flex-col gap-1 text-sm">
        <p className="text-zinc-500">
          사진 {photoCount}장 · 5점 최대 <b className="text-zinc-900 dark:text-zinc-100">{effective}장</b>{" "}
          {limit === null ? "(사진의 10%)" : "(직접 정함)"}{" "}
          <button
            type="button"
            onClick={() => {
              setValue(String(effective));
              setEditing(true);
            }}
            className="underline"
          >
            바꾸기
          </button>
        </p>
        {fiveCount > effective && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            모델이 이미 5점을 {fiveCount}장 줬어요. 모델이 5점을 낮춰야 한도에 맞춰져요.
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(Number(value));
      }}
      className="flex flex-wrap items-center gap-2 text-sm"
    >
      <span className="text-zinc-500">5점 최대</span>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={500}
        required
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-20 rounded-lg border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <span className="text-zinc-500">장</span>
      <button type="submit" disabled={pending} className="rounded-lg bg-zinc-900 px-3 py-1 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900">
        저장
      </button>
      <button type="button" onClick={() => setEditing(false)} disabled={pending} className="rounded-lg border px-3 py-1">
        취소
      </button>
      {limit !== null && (
        <button type="button" onClick={() => save(null)} disabled={pending} className="underline">
          10%로 되돌리기
        </button>
      )}
      {error && (
        <p role="alert" className="w-full text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
