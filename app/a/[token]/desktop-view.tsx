"use client";

/* eslint-disable @next/next/no-img-element -- 미리 줄여 둔 사진을 그대로 쓴다 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { photoUrl } from "@/lib/photos";
import { Grid } from "./grid";
import { StarBar } from "./star-bar";
import type { SharedAlbum } from "./types";
import type { RateMode, RatingsApi, SaveState } from "./use-ratings";
import { setViewMode, type ViewMode } from "./view-mode";

const PRELOAD = 2; // 앞뒤로 미리 불러올 큰 사진 장수

const SAVE_LABEL: Record<SaveState, string> = {
  idle: "",
  saving: "저장 중…",
  saved: "저장됨",
  error: "저장 실패 · 인터넷을 확인해 주세요",
};

type Props = {
  album: SharedAlbum;
  index: number;
  onIndexChange: (index: number) => void;
  mode: ViewMode;
  modeButton: React.ReactNode;
  ratings: RatingsApi;
  keyboardEnabled: boolean;
  onFinish: () => void;
};

// PC 배치: 브릿지처럼 가운데 큰 미리보기, 오른쪽 별점 칸, 아래 필름스트립
export function DesktopView({ album, index, onIndexChange, mode, modeButton, ratings, keyboardEnabled, onFinish }: Props) {
  const { photos, five_star_limit: limit } = album;
  const photo = photos[index];
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function go(i: number) {
    const next = Math.max(0, Math.min(photos.length - 1, i));
    if (next !== index) onIndexChange(next);
  }

  function handleRate(stars: number, mode: RateMode) {
    if (ratings.rate(photo.id, stars, mode) === "limit") {
      setNotice(`5점은 최대 ${limit}장까지예요.`);
      clearTimeout(noticeTimer.current);
      noticeTimer.current = setTimeout(() => setNotice(null), 3500);
    }
  }

  // 키보드: ← → 넘기기, 1–5 별점, 0 지우기 (필름스트립 보기에서만)
  useEffect(() => {
    if (!keyboardEnabled || mode !== "filmstrip") return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
      else if (e.key >= "1" && e.key <= "5") handleRate(Number(e.key), "toggle");
      else if (e.key === "0") handleRate(0, "set");
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // 앞뒤 사진을 미리 불러와서 넘길 때 바로 뜨게
  useEffect(() => {
    for (let i = index - PRELOAD; i <= index + PRELOAD; i++) {
      if (i !== index && photos[i]) new Image().src = photoUrl(photos[i].storage_path);
    }
  }, [index, photos]);

  return (
    <main className="fixed inset-0 flex flex-col bg-bridge text-zinc-100">
      <header className="flex h-12 flex-none items-center gap-4 border-b border-black/30 px-5">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{album.title}</span>
        {mode === "filmstrip" && (
          <span className="flex-none text-sm text-zinc-300">
            {index + 1} / {photos.length}
          </span>
        )}
        <div className="flex flex-1 justify-end">{modeButton}</div>
      </header>

      {ratings.locked && (
        <p className="flex-none bg-emerald-900/60 px-4 py-2 text-center text-sm">
          셀렉을 마친 앨범이에요. 별점은 더 바꿀 수 없어요.
        </p>
      )}

      <div className="flex min-h-0 flex-1">
        {mode === "filmstrip" ? (
          <div className="relative flex min-w-0 flex-1">
            <Preview key={photo.id} src={photoUrl(photo.storage_path)} alt={photo.filename} />
            <ArrowButton side="left" disabled={index === 0} onClick={() => go(index - 1)} />
            <ArrowButton side="right" disabled={index === photos.length - 1} onClick={() => go(index + 1)} />
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col pt-3">
            <Grid
              photos={photos}
              ratings={ratings.ratings}
              currentIndex={index}
              onOpen={(i) => {
                onIndexChange(i);
                setViewMode("filmstrip");
              }}
              columns={6}
              showHint={false}
            />
          </div>
        )}

        {/* 오른쪽 칸: 진행 상황과 별점 */}
        <aside className="flex w-64 flex-none flex-col gap-5 border-l border-black/30 p-5">
          <p className={`text-sm ${ratings.fiveCount >= limit ? "text-amber-400" : ""}`}>
            ★5점 {ratings.fiveCount}/{limit}
          </p>

          {mode === "filmstrip" ? (
            <>
              <div className="flex flex-col gap-2">
                <StarBar value={ratings.ratings[photo.id] ?? 0} disabled={ratings.locked} onRate={handleRate} />
                {notice && (
                  <p role="alert" className="text-center text-xs text-amber-400">
                    {notice}
                  </p>
                )}
                <p className="break-all text-center text-xs text-zinc-400">{photo.filename}</p>
                <p className="text-center text-xs text-zinc-500">{SAVE_LABEL[ratings.saveState]}</p>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-zinc-400">
                <dt className="font-semibold text-zinc-300">← →</dt>
                <dd>사진 넘기기</dd>
                <dt className="font-semibold text-zinc-300">1–5</dt>
                <dd>별점 (같은 숫자 다시 = 취소)</dd>
                <dt className="font-semibold text-zinc-300">0</dt>
                <dd>별점 지우기</dd>
                <dt className="font-semibold text-zinc-300">클릭</dt>
                <dd>실제 크기로 확대</dd>
              </dl>
            </>
          ) : (
            <p className="text-xs text-zinc-400">
              셀렉은 한 사람만 해 주세요. 사진을 누르면 크게 보고 별점을 매길 수 있어요.
            </p>
          )}

          {!ratings.locked && (
            <button
              type="button"
              onClick={onFinish}
              className="mt-auto rounded-lg bg-zinc-100 py-3 font-semibold text-zinc-900"
            >
              다 골랐어요
            </button>
          )}
        </aside>
      </div>

      {mode === "filmstrip" && <DesktopStrip album={album} index={index} ratings={ratings.ratings} onSelect={go} />}
    </main>
  );
}

// 큰 미리보기: 클릭하면 실제 크기(100%), 다시 클릭하면 원래대로
function Preview({ src, alt }: { src: string; alt: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [zoomed, setZoomed] = useState(false);
  const focus = useRef({ x: 0.5, y: 0.5 }); // 클릭한 곳 (사진 안 비율)

  // 확대하면 클릭한 곳이 가운데 오게
  useLayoutEffect(() => {
    const box = boxRef.current;
    const img = box?.querySelector("img");
    if (!zoomed || !box || !img) return;
    box.scrollLeft = focus.current.x * img.offsetWidth - box.clientWidth / 2;
    box.scrollTop = focus.current.y * img.offsetHeight - box.clientHeight / 2;
  }, [zoomed]);

  function toggle(e: React.MouseEvent<HTMLImageElement>) {
    if (!zoomed) {
      const r = e.currentTarget.getBoundingClientRect();
      // object-contain이라 사진이 실제로 그려진 영역 기준으로 계산
      const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
      const scale = Math.min(r.width / w, r.height / h);
      const drawnW = w * scale;
      const drawnH = h * scale;
      const left = r.left + (r.width - drawnW) / 2;
      const top = r.top + (r.height - drawnH) / 2;
      focus.current = {
        x: Math.max(0, Math.min(1, (e.clientX - left) / drawnW)),
        y: Math.max(0, Math.min(1, (e.clientY - top) / drawnH)),
      };
    }
    setZoomed(!zoomed);
  }

  return (
    <div
      ref={boxRef}
      className={`flex min-w-0 flex-1 ${zoomed ? "overflow-auto" : "items-center justify-center overflow-hidden p-4"}`}
    >
      <img
        src={src}
        alt={alt}
        onClick={toggle}
        draggable={false}
        className={
          zoomed
            ? "m-auto max-w-none cursor-zoom-out"
            : "h-full w-full cursor-zoom-in select-none object-contain"
        }
      />
    </div>
  );
}

function ArrowButton({ side, disabled, onClick }: { side: "left" | "right"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "이전 사진" : "다음 사진"}
      className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-3 py-2 text-2xl leading-none text-white/80 hover:bg-black/60 disabled:invisible ${
        side === "left" ? "left-3" : "right-3"
      }`}
    >
      {side === "left" ? "‹" : "›"}
    </button>
  );
}

// 아래 필름스트립: 썸네일과 별점, 마우스 휠로 좌우 이동
function DesktopStrip({
  album,
  index,
  ratings,
  onSelect,
}: {
  album: SharedAlbum;
  index: number;
  ratings: Record<string, number>;
  onSelect: (index: number) => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    itemRefs.current[index]?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [index]);

  return (
    <div
      ref={stripRef}
      onWheel={(e) => {
        // 세로 휠을 가로 이동으로
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) stripRef.current!.scrollLeft += e.deltaY;
      }}
      className="flex h-32 flex-none gap-2 overflow-x-auto border-t border-black/30 px-4 py-3"
    >
      {album.photos.map((photo, i) => {
        const rating = ratings[photo.id] ?? 0;
        return (
          <button
            key={photo.id}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            type="button"
            onClick={() => onSelect(i)}
            className="flex h-full flex-none flex-col items-center gap-1"
            aria-label={`${i + 1}번 사진${rating ? `, ${rating}점` : ""}`}
            aria-current={i === index}
          >
            <img
              src={photoUrl(photo.thumb_path)}
              alt=""
              loading="lazy"
              draggable={false}
              className={`min-h-0 w-auto flex-1 border-2 object-contain ${
                i === index ? "border-white" : "border-transparent opacity-80 hover:opacity-100"
              }`}
            />
            <span className="h-4 text-xs leading-4 text-zinc-300">{rating ? "★".repeat(rating) : "∗"}</span>
          </button>
        );
      })}
    </div>
  );
}
