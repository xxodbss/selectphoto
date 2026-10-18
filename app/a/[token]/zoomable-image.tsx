"use client";

/* eslint-disable @next/next/no-img-element -- 미리 줄여 둔 사진을 그대로 쓴다 */
import { useEffect, useRef, useState } from "react";

const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;

type Point = { x: number; y: number };

type Props = {
  src: string;
  alt: string;
  // src를 받는 동안 대신 보여줄 작은 사진 (보통 썸네일)
  placeholder?: string;
  loading?: "eager" | "lazy";
  // true면 원래 크기일 때 좌우 밀기를 브라우저(사진 넘기기)에 맡긴다
  swipeable?: boolean;
  // false가 되면(다른 사진으로 넘어가면) 확대를 푼다
  active?: boolean;
  onZoomChange?: (zoomed: boolean) => void;
};

// 두 손가락 확대, 확대 중 한 손가락 이동, 두 번 탭 확대/원래대로
export function ZoomableImage({ src, alt, placeholder, loading, swipeable = false, active = true, onZoomChange }: Props) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const onZoomChangeRef = useRef(onZoomChange);
  const resetRef = useRef<() => void>(() => {});

  useEffect(() => {
    onZoomChangeRef.current = onZoomChange;
  }, [onZoomChange]);

  useEffect(() => {
    if (!active) resetRef.current();
  }, [active]);

  useEffect(() => {
    const box = boxRef.current!;
    const img = imgRef.current!;

    // 지금 상태: 배율 s, 이동 t (사진 가운데 기준 픽셀)
    let s = 1;
    let t: Point = { x: 0, y: 0 };
    let zoomed = false;

    let pinch: { dist: number; s: number; t: Point; focal: Point } | null = null;
    let pan: { start: Point; t: Point } | null = null;
    let tap: { start: Point; time: number } | null = null;
    let lastTap: { at: Point; time: number } | null = null;

    // 화면 좌표 → 사진 가운데 기준 좌표
    function local(touch: Touch): Point {
      const r = box.getBoundingClientRect();
      return { x: touch.clientX - r.left - r.width / 2, y: touch.clientY - r.top - r.height / 2 };
    }

    // 사진이 화면 밖으로 너무 멀리 가지 않게
    function clamp() {
      const r = box.getBoundingClientRect();
      const maxX = ((s - 1) * r.width) / 2;
      const maxY = ((s - 1) * r.height) / 2;
      t = { x: Math.max(-maxX, Math.min(maxX, t.x)), y: Math.max(-maxY, Math.min(maxY, t.y)) };
    }

    function apply(animate = false) {
      img.style.transition = animate ? "transform 0.2s ease-out" : "none";
      img.style.transform = `translate(${t.x}px, ${t.y}px) scale(${s})`;
      box.style.touchAction = s > 1 || !swipeable ? "none" : "pan-x";

      const nowZoomed = s > 1;
      if (nowZoomed !== zoomed) {
        zoomed = nowZoomed;
        onZoomChangeRef.current?.(zoomed);
      }
    }

    // 손가락 아래 지점이 그대로 손가락 아래에 있도록 배율을 바꾼다
    function zoomAround(focalNow: Point, focalStart: Point, s0: number, t0: Point, s1: number) {
      const p = { x: (focalStart.x - t0.x) / s0, y: (focalStart.y - t0.y) / s0 };
      s = s1;
      t = { x: focalNow.x - s * p.x, y: focalNow.y - s * p.y };
      clamp();
    }

    function distance(a: Touch, b: Touch) {
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }

    function midpoint(a: Touch, b: Touch): Point {
      const pa = local(a);
      const pb = local(b);
      return { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        const [a, b] = [e.touches[0], e.touches[1]];
        pinch = { dist: distance(a, b), s, t, focal: midpoint(a, b) };
        pan = null;
        tap = null;
      } else if (e.touches.length === 1) {
        const p = local(e.touches[0]);
        tap = { start: p, time: Date.now() };
        pan = s > 1 ? { start: p, t } : null;
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (pinch && e.touches.length === 2) {
        e.preventDefault();
        const [a, b] = [e.touches[0], e.touches[1]];
        const next = Math.max(1, Math.min(MAX_SCALE, (pinch.s * distance(a, b)) / pinch.dist));
        zoomAround(midpoint(a, b), pinch.focal, pinch.s, pinch.t, next);
        apply();
      } else if (pan && e.touches.length === 1) {
        e.preventDefault();
        const p = local(e.touches[0]);
        t = { x: pan.t.x + p.x - pan.start.x, y: pan.t.y + p.y - pan.start.y };
        clamp();
        apply();
      }
      // 손가락이 움직였으면 탭이 아니다
      if (tap && e.touches.length === 1) {
        const p = local(e.touches[0]);
        if (Math.hypot(p.x - tap.start.x, p.y - tap.start.y) > 10) tap = null;
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (pinch && e.touches.length < 2) {
        pinch = null;
        // 거의 원래 크기면 딱 맞춰 되돌린다
        if (s < 1.05) {
          s = 1;
          t = { x: 0, y: 0 };
          apply(true);
        }
        // 한 손가락이 남아 있으면 이어서 이동
        if (e.touches.length === 1 && s > 1) {
          pan = { start: local(e.touches[0]), t };
        }
        return;
      }

      if (tap && e.touches.length === 0 && Date.now() - tap.time < 250) {
        const now = Date.now();
        const at = tap.start;
        if (lastTap && now - lastTap.time < DOUBLE_TAP_MS && Math.hypot(at.x - lastTap.at.x, at.y - lastTap.at.y) < 30) {
          if (s > 1) {
            s = 1;
            t = { x: 0, y: 0 };
          } else {
            zoomAround(at, at, 1, { x: 0, y: 0 }, DOUBLE_TAP_SCALE);
          }
          apply(true);
          lastTap = null;
        } else {
          lastTap = { at, time: now };
        }
      }
      tap = null;
      if (e.touches.length === 0) pan = null;
    }

    // iOS가 페이지 전체를 확대하지 않게
    function preventGesture(e: Event) {
      e.preventDefault();
    }

    resetRef.current = () => {
      s = 1;
      t = { x: 0, y: 0 };
      apply();
    };

    apply();
    box.addEventListener("touchstart", onTouchStart, { passive: true });
    box.addEventListener("touchmove", onTouchMove, { passive: false });
    box.addEventListener("touchend", onTouchEnd);
    box.addEventListener("touchcancel", onTouchEnd);
    box.addEventListener("gesturestart", preventGesture);
    return () => {
      box.removeEventListener("touchstart", onTouchStart);
      box.removeEventListener("touchmove", onTouchMove);
      box.removeEventListener("touchend", onTouchEnd);
      box.removeEventListener("touchcancel", onTouchEnd);
      box.removeEventListener("gesturestart", preventGesture);
    };
  }, [swipeable]);

  // 큰 사진을 받는 동안 이미 받아 둔 썸네일을 먼저 깔아 둔다 (빈 화면 대신 흐릿한 사진)
  const waiting = Boolean(placeholder) && placeholder !== src && loadedSrc !== src;

  return (
    <div ref={boxRef} className="relative h-full w-full overflow-hidden">
      {waiting && (
        <img
          src={placeholder}
          alt=""
          aria-hidden
          draggable={false}
          className="absolute inset-0 h-full w-full select-none object-contain"
        />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={loading}
        draggable={false}
        onLoad={() => setLoadedSrc(src)}
        className={`relative h-full w-full select-none object-contain ${waiting ? "opacity-0" : ""}`}
      />
    </div>
  );
}
