"use client";

import { useImperativeHandle, useLayoutEffect, useRef, useState, type Ref } from "react";
import { photoUrl } from "@/lib/photos";
import type { SharedPhoto } from "./types";
import { ZoomableImage } from "./zoomable-image";

const PRELOAD = 2; // 지금 사진 앞뒤로 큰 사진을 미리 불러올 장수

export type SwipeViewerHandle = {
  goTo: (index: number) => void; // 부드럽게 넘기기 (썸네일 탭)
  jumpTo: (index: number) => void; // 바로 바꾸기 (띠 훑기, 키보드)
};

type Props = {
  photos: SharedPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  ref?: Ref<SwipeViewerHandle>;
};

// 큰 사진: 좌우로 밀면 한 장씩 맞춰 멈춘다 (확대한 동안은 넘어가지 않음)
export function SwipeViewer({ photos, index, onIndexChange, ref }: Props) {
  const mainRef = useRef<HTMLDivElement>(null);
  const [zoomed, setZoomed] = useState(false);

  // 처음 그릴 때 지금 사진 위치로 바로 이동 (격자·비교에서 넘어왔을 때)
  useLayoutEffect(() => {
    const main = mainRef.current;
    if (main) main.scrollLeft = index * main.clientWidth;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    goTo(i) {
      setZoomed(false); // 다른 사진으로 가면 확대가 풀린다
      const main = mainRef.current;
      main?.scrollTo({ left: i * main.clientWidth, behavior: "smooth" });
    },
    jumpTo(i) {
      setZoomed(false);
      onIndexChange(i);
      const main = mainRef.current;
      main?.scrollTo({ left: i * main.clientWidth, behavior: "instant" });
    },
  }));

  function handleScroll() {
    const main = mainRef.current;
    if (!main) return;
    const next = Math.round(main.scrollLeft / main.clientWidth);
    if (next !== index) onIndexChange(next);
  }

  return (
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
              placeholder={photoUrl(photo.thumb_path)}
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
  );
}
