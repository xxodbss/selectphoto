"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { photoUrl } from "@/lib/photos";
import { PhotoStrip } from "./photo-strip";
import { StarBar } from "./star-bar";
import type { SharedPhoto } from "./types";
import type { RateMode, RatingsApi, SaveState } from "./use-ratings";
import { ZoomableImage } from "./zoomable-image";

const PRELOAD = 2; // 지금 사진 앞뒤로 큰 사진을 미리 불러올 장수

const SAVE_LABEL: Record<SaveState, string> = {
  idle: "",
  saving: "저장 중…",
  saved: "저장됨",
  error: "저장 실패 · 인터넷을 확인해 주세요",
};

type Props = {
  photos: SharedPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  ratings: RatingsApi;
  fiveStarLimit: number;
};

export function Filmstrip({ photos, index, onIndexChange, ratings, fiveStarLimit }: Props) {
  const mainRef = useRef<HTMLDivElement>(null);
  const [zoomed, setZoomed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const photo = photos[index];

  function handleRate(stars: number, mode: RateMode) {
    if (ratings.rate(photo.id, stars, mode) === "limit") {
      setNotice(`5점은 최대 ${fiveStarLimit}장까지예요.`);
      clearTimeout(noticeTimer.current);
      noticeTimer.current = setTimeout(() => setNotice(null), 3500);
    }
  }

  // 격자에서 넘어왔을 때 고른 사진 위치로 바로 이동
  useLayoutEffect(() => {
    const main = mainRef.current;
    if (main) main.scrollLeft = index * main.clientWidth;
    // 처음 그릴 때만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScroll() {
    const main = mainRef.current;
    if (!main) return;
    const next = Math.round(main.scrollLeft / main.clientWidth);
    if (next !== index) onIndexChange(next);
  }

  function goTo(i: number) {
    setZoomed(false); // 다른 사진으로 가면 확대가 풀린다
    const main = mainRef.current;
    main?.scrollTo({ left: i * main.clientWidth, behavior: "smooth" });
  }

  // 아래 띠를 훑는 동안에는 큰 사진을 애니메이션 없이 바로 바꾼다
  function jumpTo(i: number) {
    setZoomed(false);
    onIndexChange(i);
    const main = mainRef.current;
    main?.scrollTo({ left: i * main.clientWidth, behavior: "instant" });
  }

  return (
    <>
      {/* 큰 사진: 좌우로 밀면 한 장씩 맞춰 멈춘다 (확대한 동안은 넘어가지 않음) */}
      <div
        ref={mainRef}
        onScroll={handleScroll}
        className={`flex min-h-0 flex-1 snap-x snap-mandatory overflow-y-hidden overscroll-contain [scrollbar-width:none] ${
          zoomed ? "overflow-x-hidden" : "overflow-x-auto"
        }`}
      >
        {photos.map((photo, i) => {
          const near = Math.abs(i - index) <= PRELOAD;
          return (
            <div key={photo.id} className="h-full w-full flex-none snap-center">
              <ZoomableImage
                src={photoUrl(near ? photo.storage_path : photo.thumb_path)}
                alt={photo.filename}
                loading={near ? "eager" : "lazy"}
                swipeable
                active={i === index}
                onZoomChange={i === index ? setZoomed : undefined}
              />
            </div>
          );
        })}
      </div>

      <div className="relative flex-none pt-2">
        <StarBar
          value={ratings.ratings[photo.id] ?? 0}
          disabled={ratings.locked}
          onRate={handleRate}
        />
        {/* 가운데 글자가 오른쪽 확대 버튼과 겹치지 않게 양옆을 비운다 */}
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
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-500 text-zinc-300"
          aria-label="크게 보기"
        >
          <ExpandIcon />
        </button>
      </div>

      <PhotoStrip photos={photos} index={index} onScrub={jumpTo} onSelect={goTo} />

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

// 네 모서리 화살표 (크게 보기)
function ExpandIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
