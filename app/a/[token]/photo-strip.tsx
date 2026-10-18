"use client";

/* eslint-disable @next/next/no-img-element -- 미리 줄여 둔 썸네일을 그대로 쓴다 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { photoUrl } from "@/lib/photos";
import type { SharedPhoto } from "./types";

// 애플 사진 앱처럼: 좁은 썸네일이 촘촘히, 지금 사진만 원래 비율로 넓게
const HEIGHT = 44;
const NARROW = 24; // 좁은 썸네일 폭
const GAP = 2;
const PITCH = NARROW + GAP; // 썸네일 한 칸이 차지하는 폭
const CURRENT_MARGIN = 6; // 지금 사진 양옆 여백
const SETTLE_MS = 150; // 손을 떼고 띠가 멈췄다고 볼 시간

type Props = {
  photos: SharedPhoto[];
  index: number;
  onScrub: (index: number) => void; // 띠를 훑는 중: 큰 사진을 바로 바꾼다
  onSelect: (index: number) => void; // 썸네일을 탭
};

export function PhotoStrip({ photos, index, onScrub, onSelect }: Props) {
  const stripRef = useRef<HTMLDivElement>(null);
  const fingerDown = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [scrubbing, setScrubbing] = useState(false);
  const [ratios, setRatios] = useState<Record<string, number>>({});

  const currentRatio = ratios[photos[index].id] ?? 1.5;
  const currentWidth = Math.max(30, Math.min(80, currentRatio * HEIGHT));

  // 지금 사진이 띠 가운데 오는 스크롤 위치
  // (훑는 중에는 모든 칸이 같은 폭이라 index * PITCH)
  const target = scrubbing
    ? index * PITCH
    : index * PITCH + (currentWidth + CURRENT_MARGIN * 2 - NARROW) / 2;

  // 훑기 시작/끝에 칸 폭이 바뀌므로 위치를 바로 맞춘다
  useLayoutEffect(() => {
    if (stripRef.current) stripRef.current.scrollLeft = target;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrubbing]);

  // 큰 사진을 넘기면 띠도 따라간다
  useEffect(() => {
    if (!scrubbing) stripRef.current?.scrollTo({ left: target, behavior: "smooth" });
  }, [scrubbing, target]);

  function startScrub() {
    if (!scrubbing) setScrubbing(true);
  }

  // 손을 떼고 띠가 멈추면 훑기 끝
  function scheduleSettle() {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      if (!fingerDown.current) setScrubbing(false);
    }, SETTLE_MS);
  }

  function handleScroll() {
    const strip = stripRef.current;
    if (!scrubbing || !strip) return;
    const next = Math.max(0, Math.min(photos.length - 1, Math.round(strip.scrollLeft / PITCH)));
    if (next !== index) onScrub(next);
    scheduleSettle();
  }

  return (
    <div
      ref={stripRef}
      onScroll={handleScroll}
      onTouchStart={() => {
        fingerDown.current = true;
        startScrub();
      }}
      onTouchEnd={() => {
        fingerDown.current = false;
        scheduleSettle();
      }}
      onTouchCancel={() => {
        fingerDown.current = false;
        scheduleSettle();
      }}
      onWheel={() => {
        startScrub();
        scheduleSettle();
      }}
      className="flex flex-none touch-pan-x items-center overflow-x-auto overflow-y-hidden overscroll-contain py-2 [scrollbar-width:none]"
      style={{ gap: GAP }}
    >
      {/* 양 끝 여백: 첫 사진과 마지막 사진도 가운데 올 수 있게 */}
      <div className="flex-none" style={{ width: `calc(50% - ${NARROW / 2 + GAP}px)` }} />
      {photos.map((photo, i) => {
        const isCurrent = i === index && !scrubbing;
        return (
          <button
            key={photo.id}
            type="button"
            onClick={() => onSelect(i)}
            className="flex-none overflow-hidden"
            style={{
              height: HEIGHT,
              width: isCurrent ? currentWidth : NARROW,
              marginInline: isCurrent ? CURRENT_MARGIN : 0,
            }}
            aria-label={`${i + 1}번 사진으로`}
          >
            <img
              src={photoUrl(photo.thumb_path)}
              alt=""
              loading="lazy"
              draggable={false}
              onLoad={(e) => {
                const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                if (h) setRatios((prev) => (prev[photo.id] ? prev : { ...prev, [photo.id]: w / h }));
              }}
              className="h-full w-full object-cover"
            />
          </button>
        );
      })}
      <div className="flex-none" style={{ width: `calc(50% - ${NARROW / 2 + GAP}px)` }} />
    </div>
  );
}
