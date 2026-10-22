"use client";

/* eslint-disable @next/next/no-img-element -- Vercel 이미지 최적화 대신 미리 줄여 둔 썸네일을 그대로 쓴다 */
import { useRef, useState, useTransition } from "react";
import { photoUrl } from "@/lib/photos";
import { deletePhotos } from "./actions";
import { ui } from "@/lib/ui";

type Photo = { id: string; filename: string; thumb_path: string; rating: number };

type Drag = {
  start: number; // 누르기 시작한 사진
  select: boolean; // 지나가는 사진을 선택할지(true) 해제할지(false)
  base: Set<string>; // 누르기 전 선택 상태
  moved: boolean; // 다른 사진까지 끌었는지 (아니면 그냥 탭)
};

// 작가 화면 사진 목록: 별점 표시, 선택해서 한꺼번에 지우기
// 여러 장 고르기: 탭, Shift+클릭 범위, 끌어서 선택, 별점별로 한 번에
export function PhotoManager({ albumId, photos }: { albumId: string; photos: Photo[] }) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const anchor = useRef<number | null>(null); // Shift+클릭 범위의 시작 (마지막으로 누른 사진)
  const drag = useRef<Drag | null>(null);

  const allSelected = selected.size === photos.length;

  // base 상태에서 from–to 사이를 모두 선택(또는 해제)한 결과
  function withRange(base: Set<string>, from: number, to: number, select: boolean) {
    const next = new Set(base);
    for (let i = Math.min(from, to); i <= Math.max(from, to); i++) {
      if (select) next.add(photos[i].id);
      else next.delete(photos[i].id);
    }
    return next;
  }

  function toggle(i: number) {
    anchor.current = i;
    setSelected((prev) => withRange(prev, i, i, !prev.has(photos[i].id)));
  }

  // 손가락·마우스 아래에 있는 사진 번호
  function indexAt(x: number, y: number) {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-index]");
    return el ? Number(el.dataset.index) : null;
  }

  function onPointerDown(e: React.PointerEvent, i: number) {
    if (!selecting || e.button !== 0) return;
    // Shift+클릭: 마지막으로 누른 사진부터 여기까지 (시작 사진 상태에 맞춰 선택 또는 해제)
    if (e.shiftKey && anchor.current !== null) {
      const from = anchor.current;
      setSelected((prev) => withRange(prev, from, i, prev.has(photos[from].id)));
      anchor.current = i;
      return;
    }
    drag.current = { start: i, select: !selected.has(photos[i].id), base: selected, moved: false };
  }

  // 끌어서 선택: 시작 사진부터 지금 사진까지 같은 상태로
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const i = indexAt(e.clientX, e.clientY);
    if (i === null || (i === d.start && !d.moved)) return;
    if (!d.moved) {
      d.moved = true;
      // 마우스는 그리드 밖으로 나가도 계속 따라가게
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    setSelected(withRange(d.base, d.start, i, d.select));
    anchor.current = i;
  }

  function onPointerUp(i: number) {
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved) toggle(i); // 끌지 않았으면 그냥 탭
  }

  // 별점별로 한 번에 선택에 더하기 (0 = 안 고름)
  function addRating(rating: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      photos.filter((p) => p.rating === rating).forEach((p) => next.add(p.id));
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
      {/* 스크롤해도 장수·선택 버튼 줄은 맨 위에 붙어 따라온다 (바탕을 깔아 사진이 밑으로 지나가게) */}
      <div className="sticky top-0 z-10 -mx-4 flex h-12 items-center justify-between gap-2 bg-bridge px-4 text-sm lg:-mx-8 lg:px-8">
        {selecting ? (
          <>
            <button
              type="button"
              onClick={() => setSelected(allSelected ? new Set() : new Set(photos.map((p) => p.id)))}
              className="text-zinc-300 underline"
            >
              {allSelected ? "전체 해제" : "전체 선택"}
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={stopSelecting} disabled={pending} className={ui.pill}>
                취소
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={selected.size === 0 || pending}
                className="rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
              >
                {pending ? "지우는 중…" : `선택한 ${selected.size}장 지우기`}
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="text-zinc-400">사진 {photos.length}장 (촬영 시간순)</span>
            <button type="button" onClick={() => setSelecting(true)} className={ui.pill}>
              선택
            </button>
          </>
        )}
      </div>

      {selecting && (
        <div className="flex flex-col gap-2 text-xs text-zinc-400">
          <p>
            탭해서 고르거나, 누른 채로 끌어서 여러 장을 골라요. 컴퓨터에서는 Shift를 누르고 클릭하면 사이가 모두 골라져요.
          </p>
          {/* 별점별로 한 번에 선택에 더하기 */}
          <div className="flex flex-wrap gap-1.5">
            {[0, 1, 2, 3, 4, 5].map((rating) => {
              const count = photos.filter((p) => p.rating === rating).length;
              return (
                <button
                  key={rating}
                  type="button"
                  onClick={() => addRating(rating)}
                  disabled={count === 0}
                  className={`${ui.pill} tabular-nums`}
                >
                  {rating === 0 ? "안 고름" : `★${rating}`} {count}장 선택
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className={ui.error}>
          {error}
        </p>
      )}

      <ul
        onPointerMove={onPointerMove}
        // 끌기 중에는 목록이 마우스를 붙잡고 있어서, 손을 뗀 신호도 여기서 받는다
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        // 선택 중 휴대폰: 위아래로 먼저 밀면 스크롤, 옆으로 먼저 끌면 선택 (오래 눌러도 저장 메뉴가 안 뜨게)
        className={`grid grid-cols-3 gap-2 lg:grid-cols-6 ${
          selecting ? "touch-pan-y select-none [-webkit-touch-callout:none]" : ""
        }`}
      >
        {photos.map((photo, i) => {
          const isSelected = selected.has(photo.id);
          return (
            <li key={photo.id} data-index={i} className="flex flex-col gap-1">
              <button
                type="button"
                onPointerDown={(e) => onPointerDown(e, i)}
                onPointerUp={() => onPointerUp(i)}
                // 손가락·마우스는 위에서 처리하고, 키보드(Enter·Space)로 누를 때만 여기서
                onClick={(e) => selecting && e.detail === 0 && toggle(i)}
                className={`relative block ${selecting ? "cursor-pointer" : "cursor-default"}`}
                aria-pressed={selecting ? isSelected : undefined}
                aria-label={photo.filename}
              >
                <img
                  src={photoUrl(photo.thumb_path)}
                  alt={photo.filename}
                  loading="lazy"
                  draggable={false}
                  className={`aspect-square w-full rounded-md bg-black/20 object-cover ${
                    isSelected ? "opacity-60" : ""
                  }`}
                />
                {photo.rating > 0 && (
                  <span className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-xs font-semibold text-zinc-300">
                    ★{photo.rating}
                  </span>
                )}
                {selecting && (
                  <span
                    className={`absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 text-xs ${
                      isSelected ? "border-zinc-100 bg-zinc-100 text-zinc-900" : "border-white/80 bg-black/30"
                    }`}
                  >
                    {isSelected && "✓"}
                  </span>
                )}
              </button>
              <span className="truncate text-xs text-zinc-400">
                {i + 1}. {photo.filename}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
