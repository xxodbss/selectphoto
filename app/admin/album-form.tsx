"use client";

import { useActionState } from "react";
import { createAlbum } from "./actions";

export function AlbumForm() {
  const [state, formAction, pending] = useActionState(createAlbum, null);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h2 className="font-semibold">새 앨범</h2>
      <label className="flex flex-col gap-1 text-sm">
        앨범 이름
        <input
          name="title"
          required
          maxLength={100}
          placeholder="예: 10/18 한강 스냅 — 지민"
          className="rounded-lg border border-zinc-300 px-3 py-3 text-base dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <p className="text-xs text-zinc-500">
        5점 최대 장수는 사진 장수의 10%로 정해져요. 앨범 화면에서 바꿀 수 있어요.
      </p>
      {state?.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 py-3 font-semibold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "만드는 중…" : "앨범 만들기"}
      </button>
    </form>
  );
}
