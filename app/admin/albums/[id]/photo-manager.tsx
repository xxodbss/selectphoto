"use client";

/* eslint-disable @next/next/no-img-element -- Vercel 이미지 최적화 대신 미리 줄여 둔 썸네일을 그대로 쓴다 */
import { useRef, useState, useTransition } from "react";
import { photoUrl } from "@/lib/photos";
import { FilterChips } from "@/app/a/[token]/filter-chips";
import { filterLabel, matchesFilter, type RatingFilter } from "@/app/a/[token]/rating-filter";
import { deletePhotos } from "./actions";
import { PhotoPreview } from "./photo-preview";
import { ui } from "@/lib/ui";

type Photo = { id: string; filename: string; storage_path: string; thumb_path: string; rating: number };

type Drag = {
  start: number; // 누르기 시작한 사진
  select: boolean; // 지나가는 사진을 선택할지(true) 해제할지(false)
  base: Set<string>; // 누르기 전 선택 상태
  moved: boolean; // 다른 사진까지 끌었는지 (아니면 그냥 탭)
};

// 작가 화면 사진 목록: 별점 표시, 별점별로 골라 보기, 선택해서 한꺼번에 지우기
// 여러 장 고르기: 탭, Shift+클릭 범위, 끌어서 선택, 별점별로 한 번에
export function PhotoManager({ albumId, photos: allPhotos }: { albumId: string; photos: Photo[] }) {
  const [filter, setFilter] = useState<RatingFilter>("all");
  // 지금 보이는 사진 (골라 보기 적용) — 아래 선택·크게 보기는 모두 이 목록 기준
  const photos = allPhotos.filter((p) => matchesFilter(p.rating, filter));
  // 골라 볼 때도 원래 번호를 보여준다 (모델 화면과 같게)
  const numbers = new Map(allPhotos.map((p, i) => [p.id, i + 1]));
  const ratings = Object.fromEntries(allPhotos.map((p) => [p.id, p.rating]));
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  // 크게 보는 사진 (선택 중이 아닐 때 탭) — 순서 대신 id로 기억해서, 새로 고침으로 목록이 바뀌어도 같은 사진을 찾는다
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const anchor = useRef<string | null>(null); // Shift+클릭 범위의 시작 (마지막으로 누른 사진 id)
  const drag = useRef<Drag | null>(null);

  // 보던 사진이 목록에서 빠지면(모델이 별점을 바꾸는 등) 크게 보기를 닫는다
  const viewing = viewingId === null ? -1 : photos.findIndex((p) => p.id === viewingId);
  // 장수·전체 선택·지우기는 선택한 사진 중 지금 보이는 것만 (새로 고침으로 안 보이게 된 사진이 지워지지 않게)
  const visibleSelected = photos.filter((p) => selected.has(p.id));
  const allSelected = photos.length > 0 && visibleSelected.length === photos.length;
  // 별점별로 한 번에 선택: 지금 골라 보는 목록에 있을 수 있는 점수만 (★5만 볼 때는 숨김)
  const ratingButtons = [0, 1, 2, 3, 4, 5].filter((rating) => matchesFilter(rating, filter));

  // 골라 보기를 바꾸면 안 보이게 된 사진은 선택에서 뺀다 (다시 전체로 돌아와도 되살아나지 않게)
  function applyFilter(next: RatingFilter) {
    setFilter(next);
    setViewingId(null);
    anchor.current = null;
    setSelected((prev) => new Set([...prev].filter((id) => matchesFilter(ratings[id] ?? 0, next))));
  }

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
    anchor.current = photos[i].id;
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
    // 시작 사진이 지워졌거나 목록에서 빠졌으면 그냥 탭처럼
    const from = e.shiftKey ? photos.findIndex((p) => p.id === anchor.current) : -1;
    if (from >= 0) {
      setSelected((prev) => withRange(prev, from, i, prev.has(photos[from].id)));
      anchor.current = photos[i].id;
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
    anchor.current = photos[i].id;
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
    anchor.current = null;
  }

  function remove() {
    const ids = visibleSelected.map((p) => p.id);
    if (!confirm(`사진 ${ids.length}장을 지울까요? 지운 사진은 되돌릴 수 없어요.`)) return;
    startTransition(async () => {
      const result = await deletePhotos(albumId, ids);
      if (result.error) setError(result.error);
      else stopSelecting();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 스크롤해도 장수·선택 버튼 줄과 골라 보기 줄은 맨 위에 붙어 따라온다 (바탕을 깔아 사진이 밑으로 지나가게) */}
      <div className="sticky top-0 z-10 -mx-4 bg-bridge lg:-mx-8">
        <div className="flex h-12 items-center justify-between gap-2 px-4 text-sm lg:px-8">
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
                  disabled={visibleSelected.length === 0 || pending}
                  className="rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
                >
                  {pending ? "지우는 중…" : `선택한 ${visibleSelected.length}장 지우기`}
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="text-zinc-400">
                사진 {photos.length}장 ({filter === "all" ? "촬영 시간순" : filterLabel(filter)})
              </span>
              <button type="button" onClick={() => setSelecting(true)} className={ui.pill}>
                선택
              </button>
            </>
          )}
        </div>
        <FilterChips photos={allPhotos} ratings={ratings} value={filter} onChange={applyFilter} className="px-4 lg:px-8" />
      </div>

      {selecting && (
        <div className="flex flex-col gap-2 text-xs text-zinc-400">
          <p>
            탭해서 고르거나, 누른 채로 끌어서 여러 장을 골라요. 컴퓨터에서는 Shift를 누르고 클릭하면 사이가 모두 골라져요.
          </p>
          {/* 별점별로 한 번에 선택에 더하기 (점수 하나만 골라 볼 때는 전체 선택과 같아서 숨김) */}
          {ratingButtons.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {ratingButtons.map((rating) => {
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
          )}
        </div>
      )}

      {error && (
        <p role="alert" className={ui.error}>
          {error}
        </p>
      )}

      {photos.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-10 text-sm text-zinc-400">
          <p>{filterLabel(filter)} 사진이 없어요.</p>
          <button type="button" onClick={() => applyFilter("all")} className={ui.pill}>
            전체 보기
          </button>
        </div>
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
                // 선택 중: 손가락·마우스는 위에서 처리하고, 키보드(Enter·Space)로 누를 때만 여기서
                // 선택 중이 아니면: 크게 보기
                onClick={(e) => (selecting ? e.detail === 0 && toggle(i) : setViewingId(photo.id))}
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
                {numbers.get(photo.id)}. {photo.filename}
              </span>
            </li>
          );
        })}
      </ul>

      {viewing >= 0 && (
        <PhotoPreview
          photos={photos}
          index={viewing}
          number={filter === "all" ? null : (numbers.get(photos[viewing].id) ?? null)}
          onChange={(i) => setViewingId(photos[i].id)}
          onClose={() => setViewingId(null)}
        />
      )}
    </div>
  );
}
