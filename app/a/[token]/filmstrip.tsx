"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { photoUrl } from "@/lib/photos";
import { PhotoStrip } from "./photo-strip";
import type { SharedPhoto } from "./types";
import { ZoomableImage } from "./zoomable-image";

const PRELOAD = 2; // 지금 사진 앞뒤로 큰 사진을 미리 불러올 장수

type Props = {
  photos: SharedPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
};

export function Filmstrip({ photos, index, onIndexChange }: Props) {
  const mainRef = useRef<HTMLDivElement>(null);
  const [zoomed, setZoomed] = useState(false);

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

      <p className="flex-none truncate px-4 py-2 text-center text-xs text-zinc-400">
        {photos[index].filename}
      </p>

      <PhotoStrip photos={photos} index={index} onScrub={jumpTo} onSelect={goTo} />
    </>
  );
}
