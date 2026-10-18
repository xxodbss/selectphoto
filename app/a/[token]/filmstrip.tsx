"use client";

import { useEffect, useRef, useState } from "react";
import { photoUrl } from "@/lib/photos";
import { PhotoStrip } from "./photo-strip";
import { StarBar } from "./star-bar";
import { SwipeViewer, type SwipeViewerHandle } from "./swipe-viewer";
import type { SharedPhoto } from "./types";
import { SAVE_LABEL, type RatingsApi } from "./use-ratings";
import { ZoomableImage } from "./zoomable-image";

type Props = {
  photos: SharedPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  ratings: RatingsApi;
  keyboardEnabled: boolean; // 확인 창이 떠 있으면 끈다
  onCompare: () => void; // 위아래 고정 비교 시작
};

export function Filmstrip({ photos, index, onIndexChange, ratings, keyboardEnabled, onCompare }: Props) {
  const viewerRef = useRef<SwipeViewerHandle>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const { notice, rate } = ratings;

  const photo = photos[index];
  const jumpTo = (i: number) => viewerRef.current?.jumpTo(i);

  // PC 키보드: ← → 사진 이동, 1–5 별점(같은 숫자 다시 = 취소), 0 지우기, Esc 크게 보기 닫기
  useEffect(() => {
    if (!keyboardEnabled) return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight" && index < photos.length - 1) jumpTo(index + 1);
      else if (e.key === "ArrowLeft" && index > 0) jumpTo(index - 1);
      else if (e.key >= "1" && e.key <= "5") rate(photo.id, Number(e.key), "toggle");
      else if (e.key === "0") rate(photo.id, 0, "set");
      else if (e.key === "Escape" && fullscreen) setFullscreen(false);
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <>
      <SwipeViewer ref={viewerRef} photos={photos} index={index} onIndexChange={onIndexChange} />

      <div className="relative flex-none pt-2">
        <StarBar
          value={ratings.ratings[photo.id] ?? 0}
          disabled={ratings.locked}
          onRate={(stars, mode) => rate(photo.id, stars, mode)}
        />
        {/* 가운데 글자가 양옆 동그라미 버튼과 겹치지 않게 양옆을 비운다 */}
        {notice ? (
          <p role="alert" className="px-14 py-1 text-center text-xs text-amber-400">
            {notice}
          </p>
        ) : (
          <p className="truncate px-14 py-1 text-center text-xs text-zinc-400">
            {photo.filename}
            {SAVE_LABEL[ratings.saveState] && ` · ${SAVE_LABEL[ratings.saveState]}`}
          </p>
        )}
        {photos.length > 1 && (
          <RoundButton side="left" label="다른 사진과 비교하기" onClick={onCompare}>
            <CompareIcon />
          </RoundButton>
        )}
        <RoundButton side="right" label="크게 보기" onClick={() => setFullscreen(true)}>
          <ExpandIcon />
        </RoundButton>
      </div>

      <PhotoStrip photos={photos} index={index} onScrub={jumpTo} onSelect={(i) => viewerRef.current?.goTo(i)} />

      {/* 크게 보기: 화면 전체에 띄우고, 두 손가락·두 번 탭으로 확대 */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-bridge">
          <ZoomableImage src={photoUrl(photo.storage_path)} alt={photo.filename} />
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-sm text-white"
          >
            닫기 ✕
          </button>
        </div>
      )}
    </>
  );
}

// 별점 줄 양옆의 작은 동그라미 버튼
function RoundButton({
  side,
  label,
  onClick,
  children,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-500 text-zinc-300 ${
        side === "left" ? "left-4" : "right-4"
      }`}
    >
      {children}
    </button>
  );
}

// 네 모서리 화살표 (크게 보기)
function ExpandIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 위아래 두 칸 (비교)
function CompareIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="2.5" y="2" width="11" height="5" rx="1" />
      <rect x="2.5" y="9" width="11" height="5" rx="1" />
    </svg>
  );
}
