"use client";

/* eslint-disable @next/next/no-img-element -- 미리 줄여 둔 썸네일을 그대로 쓴다 */
import { useEffect, useRef, useState } from "react";
import { photoUrl } from "@/lib/photos";
import type { SharedPhoto } from "./types";

// 애플 사진 앱처럼 좁은 썸네일이 촘촘히, 지금 사진은 얇은 테두리로 표시
const HEIGHT = 44;
const NARROW = 24; // 썸네일 폭
const GAP = 2;
const PITCH = NARROW + GAP; // 썸네일 한 칸이 차지하는 폭
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

  // 큰 사진을 넘기면 띠도 따라가서 지금 사진이 가운데 온다 (처음 열릴 때는 바로 그 위치에)
  const placed = useRef(false);
  useEffect(() => {
    if (scrubbing) return;
    stripRef.current?.scrollTo({ left: index * PITCH, behavior: placed.current ? "smooth" : "instant" });
    placed.current = true;
  }, [scrubbing, index]);

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
      {photos.map((photo, i) => (
        <button
          key={photo.id}
          type="button"
          onClick={() => onSelect(i)}
          className="relative flex-none overflow-hidden"
          style={{ height: HEIGHT, width: NARROW }}
          aria-label={`${i + 1}번 사진으로`}
          aria-current={i === index}
        >
          <img
            src={photoUrl(photo.thumb_path)}
            alt=""
            loading="lazy"
            draggable={false}
            className="h-full w-full object-cover"
          />
          {/* 안쪽 테두리라 크기가 바뀌지 않는다 */}
          {i === index && <span className="absolute inset-0 border-[1.5px] border-white" />}
        </button>
      ))}
      <div className="flex-none" style={{ width: `calc(50% - ${NARROW / 2 + GAP}px)` }} />
    </div>
  );
}
