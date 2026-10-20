"use client";

import { useActionState } from "react";
import { createAlbum } from "./actions";
import { ui } from "@/lib/ui";

export function AlbumForm() {
  const [state, formAction, pending] = useActionState(createAlbum, null);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3"
    >
      <h2 className="font-semibold">새 앨범</h2>
      <label className="flex flex-col gap-1 text-sm text-zinc-300">
        앨범 이름
        <input
          name="title"
          required
          maxLength={100}
          placeholder="예: 10/18 한강 스냅 — 지민"
          className={ui.input}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-zinc-300">
        5점 최대 장수 (보정 장수)
        <input
          name="five_star_limit"
          type="number"
          inputMode="numeric"
          min={1}
          max={500}
          defaultValue={10}
          required
          className={ui.input}
        />
      </label>
      {state?.error && (
        <p role="alert" className={ui.error}>
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className={ui.primary}
      >
        {pending ? "만드는 중…" : "앨범 만들기"}
      </button>
    </form>
  );
}
