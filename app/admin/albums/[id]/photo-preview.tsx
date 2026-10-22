"use client";

import { useEffect, useRef } from "react";
import { SwipeViewer, type SwipeViewerHandle } from "@/app/a/[token]/swipe-viewer";

type Photo = { id: string; filename: string; storage_path: string; thumb_path: string; rating: number };

// 작가 화면에서 사진 크게 보기: 모델 화면과 같은 큰 사진 보기를 그대로 쓴다
// (좌우로 밀어 넘기기, 두 손가락·두 번 탭 확대, 썸네일 먼저 + 진행 막대, 원래 파일명으로 저장)
// 닫기 버튼·Esc로 닫고, PC는 ← →로 옆 사진
export function PhotoPreview({
  photos,
  index,
  onChange,
  onClose,
}: {
  photos: Photo[];
  index: number;
  onChange: (index: number) => void;
  onClose: () => void;
}) {
  const viewerRef = useRef<SwipeViewerHandle>(null);
  const photo = photos[index];

  // PC 키보드: 모델 화면과 같게
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight" && index < photos.length - 1) viewerRef.current?.jumpTo(index + 1);
      else if (e.key === "ArrowLeft" && index > 0) viewerRef.current?.jumpTo(index - 1);
      else if (e.key === "Escape") onClose();
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // 열려 있는 동안 뒤 페이지가 스크롤되지 않게
  useEffect(() => {
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = before;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.filename}
      className="fixed inset-0 z-50 flex flex-col bg-black/90 py-4"
    >
      <SwipeViewer ref={viewerRef} photos={photos} index={index} onIndexChange={onChange} />
      <p className="flex-none px-4 pt-3 text-center text-sm text-zinc-300 tabular-nums">
        {index + 1} / {photos.length} · {photo.filename}
        {photo.rating > 0 && ` · ★${photo.rating}`}
      </p>
      {/* 모델 화면 크게 보기와 같은 닫기 버튼 */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 z-10 rounded-full bg-black/60 px-3 py-1 text-sm text-white"
      >
        닫기 ✕
      </button>
    </div>
  );
}
