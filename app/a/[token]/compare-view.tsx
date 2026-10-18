"use client";

import { useEffect, useRef } from "react";
import { photoUrl } from "@/lib/photos";
import { PhotoStrip } from "./photo-strip";
import { StarBar } from "./star-bar";
import { SwipeViewer, type SwipeViewerHandle } from "./swipe-viewer";
import type { SharedPhoto } from "./types";
import type { RateMode, RatingsApi } from "./use-ratings";
import { ZoomableImage } from "./zoomable-image";

type Props = {
  photos: SharedPhoto[];
  pinned: number; // 위에 고정한 사진
  candidate: number; // 아래에서 넘겨 가며 비교하는 사진
  onCandidateChange: (index: number) => void;
  onPin: (index: number) => void; // 아래 사진을 위로 올려 고정
  ratings: RatingsApi;
  keyboardEnabled: boolean;
  onClose: () => void;
};

// 위아래 고정 비교: 위 사진은 그대로, 아래 사진만 넘기며 비슷한 컷 중 나은 쪽을 고른다
export function CompareView({
  photos,
  pinned,
  candidate,
  onCandidateChange,
  onPin,
  ratings,
  keyboardEnabled,
  onClose,
}: Props) {
  const viewerRef = useRef<SwipeViewerHandle>(null);
  const { notice, rate } = ratings;

  const pinnedPhoto = photos[pinned];
  const candidatePhoto = photos[candidate];
  const jumpTo = (i: number) => viewerRef.current?.jumpTo(i);

  // 아래 사진이 더 나으면 위로 올리고, 아래는 그다음 사진으로
  function pinCandidate() {
    onPin(candidate);
    const next = candidate < photos.length - 1 ? candidate + 1 : candidate - 1;
    jumpTo(next);
  }

  // PC 키보드: ← → 아래 사진 넘기기, 1–5·0 아래 사진 별점, Esc 닫기
  useEffect(() => {
    if (!keyboardEnabled) return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight" && candidate < photos.length - 1) jumpTo(candidate + 1);
      else if (e.key === "ArrowLeft" && candidate > 0) jumpTo(candidate - 1);
      else if (e.key >= "1" && e.key <= "5") rate(candidatePhoto.id, Number(e.key), "toggle");
      else if (e.key === "0") rate(candidatePhoto.id, 0, "set");
      else if (e.key === "Escape") onClose();
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <>
      {/* 위: 고정한 사진 */}
      <section className="flex min-h-0 flex-1 flex-col border-b border-black/40">
        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-0">
            <ZoomableImage key={pinnedPhoto.id} src={photoUrl(pinnedPhoto.storage_path)} alt={pinnedPhoto.filename} />
          </div>
          <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs">고정</span>
        </div>
        <PhotoBar
          photo={pinnedPhoto}
          ratings={ratings}
          onRate={(stars, mode) => rate(pinnedPhoto.id, stars, mode)}
        />
      </section>

      {/* 아래: 좌우로 넘기며 비교할 사진 */}
      <section className="relative flex min-h-0 flex-1 flex-col">
        <SwipeViewer ref={viewerRef} photos={photos} index={candidate} onIndexChange={onCandidateChange} />
        {notice && (
          <p role="alert" className="absolute inset-x-0 top-2 text-center">
            <span className="rounded bg-black/70 px-3 py-1 text-xs text-amber-400">{notice}</span>
          </p>
        )}
        <PhotoBar
          photo={candidatePhoto}
          ratings={ratings}
          onRate={(stars, mode) => rate(candidatePhoto.id, stars, mode)}
          action={
            candidate !== pinned && (
              <button type="button" onClick={pinCandidate} className="rounded-full border border-zinc-500 px-2 py-1 text-xs">
                이걸 고정
              </button>
            )
          }
        />
      </section>

      <PhotoStrip photos={photos} index={candidate} onScrub={jumpTo} onSelect={(i) => viewerRef.current?.goTo(i)} />
    </>
  );
}

// 사진 아래 한 줄: 파일명 · 별점 · (아래 사진만) 이걸 고정
function PhotoBar({
  photo,
  ratings,
  onRate,
  action,
}: {
  photo: SharedPhoto;
  ratings: RatingsApi;
  onRate: (stars: number, mode: RateMode) => void;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid flex-none grid-cols-[1fr_auto_1fr] items-center gap-2 px-3">
      <span className="truncate text-xs text-zinc-400">{photo.filename}</span>
      <StarBar value={ratings.ratings[photo.id] ?? 0} disabled={ratings.locked} onRate={onRate} />
      <div className="justify-self-end">{action}</div>
    </div>
  );
}
