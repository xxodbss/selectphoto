"use client";

/* eslint-disable @next/next/no-img-element -- 미리 줄여 둔 사진을 그대로 쓴다 */
import { useEffect, useRef, useState } from "react";
import { useImageProgress } from "./use-image-progress";

// 1×1 투명 GIF: 큰 사진을 받기 전 img 자리를 비워 둘 때 쓴다
const EMPTY_IMAGE = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

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
    let mousePan: { start: Point; t: Point; moved: boolean } | null = null;
    let pointerType = ""; // 마지막으로 누른 게 마우스인지 (터치 뒤에 따라오는 가짜 마우스 이벤트를 거르려고)

    // 화면 좌표 → 사진 가운데 기준 좌표
    function local(touch: { clientX: number; clientY: number }): Point {
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

    // PC 마우스: 사진을 두 번 클릭하면 확대/원래대로, 확대 중에는 끌어서 이동
    function onPointerDown(e: PointerEvent) {
      pointerType = e.pointerType;
      if (e.pointerType === "mouse" && e.button === 0 && s > 1) {
        mousePan = { start: local(e), t, moved: false };
      }
    }

    function onPointerMove(e: PointerEvent) {
      if (!mousePan) return;
      const p = local(e);
      if (Math.hypot(p.x - mousePan.start.x, p.y - mousePan.start.y) > 3) mousePan.moved = true;
      t = { x: mousePan.t.x + p.x - mousePan.start.x, y: mousePan.t.y + p.y - mousePan.start.y };
      clamp();
      apply();
    }

    function onPointerUp() {
      // 끌고 난 직후의 클릭은 무시 (빈 곳 클릭으로 닫히지 않게)
      if (mousePan?.moved) {
        window.addEventListener("click", swallowClick, { capture: true, once: true });
        setTimeout(() => window.removeEventListener("click", swallowClick, { capture: true }), 0);
      }
      mousePan = null;
    }

    function swallowClick(e: MouseEvent) {
      e.stopPropagation();
      e.preventDefault();
    }

    function onDoubleClick(e: MouseEvent) {
      if (pointerType !== "mouse") return; // 휴대폰 두 번 탭은 위 터치 처리가 맡는다
      if (s > 1) {
        s = 1;
        t = { x: 0, y: 0 };
      } else if (e.target === img) {
        const at = local(e);
        zoomAround(at, at, 1, { x: 0, y: 0 }, DOUBLE_TAP_SCALE);
      } else {
        return;
      }
      apply(true);
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
    box.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    box.addEventListener("dblclick", onDoubleClick);
    return () => {
      box.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      box.removeEventListener("dblclick", onDoubleClick);
      box.removeEventListener("touchstart", onTouchStart);
      box.removeEventListener("touchmove", onTouchMove);
      box.removeEventListener("touchend", onTouchEnd);
      box.removeEventListener("touchcancel", onTouchEnd);
      box.removeEventListener("gesturestart", preventGesture);
    };
  }, [swipeable]);

  // 큰 사진을 받는 동안 이미 받아 둔 썸네일을 먼저 깔아 두고, 아래에 얇은 진행 막대를 보여준다
  const needsLoad = Boolean(placeholder) && placeholder !== src;
  const { progress, done, failed } = useImageProgress(src, needsLoad);
  // 다 받은 뒤에 같은 주소로 띄운다 (받기에 실패하면 일반 방식으로)
  const displaySrc = !needsLoad || done || failed ? src : undefined;
  const waiting = needsLoad && (displaySrc === undefined || loadedSrc !== displaySrc);

  return (
    // 사진 칸을 사진 비율 그대로 가운데에 둔다 (꾹 누를 때 아이폰 미리보기가 상자 크기로 퍼지지 않게)
    <div ref={boxRef} className="relative flex h-full w-full items-center justify-center overflow-hidden">
      {waiting && (
        <img
          src={placeholder}
          alt=""
          aria-hidden
          draggable={false}
          // 흐림 효과는 가장자리가 번져 반투명한 네모가 보여서 쓰지 않는다 (받는 중은 아래 막대로 표시)
          // 받는 중에 꾹 눌러도 이 썸네일이 미리보기로 퍼지지 않게 터치를 통과시킨다
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
        />
      )}
      {/* 주소가 빈 img는 Safari가 깨진 그림 상자(얇은 테두리)로 그려서, 다 받기 전엔 빈 투명 이미지로 둔다 */}
      <img
        ref={imgRef}
        src={displaySrc ?? EMPTY_IMAGE}
        alt={displaySrc ? alt : ""}
        // 진행률을 셀 때 받은 사진(같은 방식의 요청)을 그대로 다시 쓰게
        crossOrigin={needsLoad ? "anonymous" : undefined}
        loading={loading}
        draggable={false}
        onLoad={() => displaySrc && setLoadedSrc(displaySrc)}
        className={`relative max-h-full max-w-full select-none ${waiting ? "opacity-0" : ""}`}
      />
      {/* 선명한 사진을 받는 중: 사진 아래쪽 얇은 진행 막대 (전체 크기를 모르면 은은하게 깜빡임) */}
      {waiting && (
        <div role="progressbar" aria-label="사진 불러오는 중" className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10">
          <div
            className={`h-full bg-white/80 transition-[width] duration-150 ${progress === null ? "w-full animate-pulse" : ""}`}
            style={progress === null ? undefined : { width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
