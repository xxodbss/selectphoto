"use client";

/* eslint-disable @next/next/no-img-element -- Vercel 이미지 최적화 대신 미리 줄여 둔 사진을 그대로 쓴다 */
import { useEffect } from "react";
import { photoUrl } from "@/lib/photos";

type Photo = { id: string; filename: string; storage_path: string; thumb_path: string; rating: number };

// 작가 화면에서 사진을 잠깐 크게 보기: 아무 데나 누르거나 Esc로 닫기, ← →로 옆 사진
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
  const photo = photos[index];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && index > 0) onChange(index - 1);
      else if (e.key === "ArrowRight" && index < photos.length - 1) onChange(index + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos.length, onChange, onClose]);

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
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/85 p-4 lg:p-10"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg text-zinc-100"
      >
        ×
      </button>
      {/* 썸네일을 먼저 깔고 큰 사진이 받아지면 그 위에 겹친다 (같은 크기로 맞춰서 바로 보이는 느낌) */}
      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
        <img
          key={`thumb-${photo.id}`}
          src={photoUrl(photo.thumb_path)}
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
        />
        <img
          key={photo.id}
          src={photoUrl(photo.storage_path)}
          alt={photo.filename}
          className="relative max-h-full max-w-full object-contain"
        />
      </div>
      <p className="flex-none text-sm text-zinc-300 tabular-nums">
        {index + 1}. {photo.filename}
        {photo.rating > 0 && ` · ★${photo.rating}`}
      </p>
    </div>
  );
}
