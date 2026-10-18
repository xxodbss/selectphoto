"use client";

/* eslint-disable @next/next/no-img-element -- Vercel 이미지 최적화 대신 미리 줄여 둔 썸네일을 그대로 쓴다 */
import { useState, useTransition } from "react";
import { photoUrl } from "@/lib/photos";
import { deletePhotos } from "./actions";

type Photo = { id: string; filename: string; thumb_path: string; rating: number };

// 작가 화면 사진 목록: 별점 표시, 선택해서 한꺼번에 지우기
export function PhotoManager({ albumId, photos }: { albumId: string; photos: Photo[] }) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allSelected = selected.size === photos.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function stopSelecting() {
    setSelecting(false);
    setSelected(new Set());
    setError(null);
  }

  function remove() {
    if (!confirm(`사진 ${selected.size}장을 지울까요? 지운 사진은 되돌릴 수 없어요.`)) return;
    startTransition(async () => {
      const result = await deletePhotos(albumId, [...selected]);
      if (result.error) setError(result.error);
      else stopSelecting();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        {selecting ? (
          <>
            <button
              type="button"
              onClick={() => setSelected(allSelected ? new Set() : new Set(photos.map((p) => p.id)))}
              className="underline"
            >
              {allSelected ? "전체 해제" : "전체 선택"}
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={stopSelecting} disabled={pending} className="rounded-lg border px-3 py-2">
                취소
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={selected.size === 0 || pending}
                className="rounded-lg bg-red-600 px-3 py-2 font-semibold text-white disabled:opacity-40"
              >
                {pending ? "지우는 중…" : `선택한 ${selected.size}장 지우기`}
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="text-zinc-500">사진 {photos.length}장 (촬영 시간순)</span>
            <button type="button" onClick={() => setSelecting(true)} className="rounded-lg border px-3 py-2">
              선택
            </button>
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <ul className="grid grid-cols-3 gap-2 lg:grid-cols-6">
        {photos.map((photo, i) => {
          const isSelected = selected.has(photo.id);
          return (
            <li key={photo.id} className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => selecting && toggle(photo.id)}
                className={`relative block ${selecting ? "cursor-pointer" : "cursor-default"}`}
                aria-pressed={selecting ? isSelected : undefined}
                aria-label={photo.filename}
              >
                <img
                  src={photoUrl(photo.thumb_path)}
                  alt={photo.filename}
                  loading="lazy"
                  className={`aspect-square w-full rounded-md bg-zinc-100 object-cover dark:bg-zinc-800 ${
                    isSelected ? "opacity-60" : ""
                  }`}
                />
                {photo.rating > 0 && (
                  <span className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-xs font-semibold text-zinc-100">
                    ★{photo.rating}
                  </span>
                )}
                {selecting && (
                  <span
                    className={`absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 text-xs ${
                      isSelected ? "border-red-600 bg-red-600 text-white" : "border-white bg-black/30"
                    }`}
                  >
                    {isSelected && "✓"}
                  </span>
                )}
              </button>
              <span className="truncate text-xs text-zinc-500">
                {i + 1}. {photo.filename}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
