"use client";

import { useState } from "react";
import { Filmstrip } from "./filmstrip";
import { Grid } from "./grid";
import type { SharedAlbum } from "./types";
import { setViewMode, useViewMode, VIEW_MODES, type ViewMode } from "./view-mode";

const MODE_LABEL: Record<ViewMode, string> = {
  filmstrip: "필름스트립",
  grid: "격자",
};

export function SelectApp({ album }: { album: SharedAlbum }) {
  const mode = useViewMode();
  const [index, setIndex] = useState(0);
  const { photos } = album;

  const nextMode = VIEW_MODES[(VIEW_MODES.indexOf(mode) + 1) % VIEW_MODES.length];

  if (photos.length === 0) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-bridge px-4 text-center text-zinc-300">
        아직 사진이 없어요. 작가님이 사진을 올리면 다시 열어 주세요.
      </main>
    );
  }

  return (
    // 화면 전체를 고정해서 위아래로 밀어도 페이지가 움직이지 않게
    <main className="fixed inset-0 flex flex-col overscroll-none bg-bridge text-zinc-100">
      <header className="flex h-12 flex-none items-center justify-between gap-3 px-4">
        <span className="truncate text-sm">
          {mode === "filmstrip" ? `${index + 1} / ${photos.length}` : album.title}
        </span>
        <button
          type="button"
          onClick={() => setViewMode(nextMode)}
          className="flex-none rounded-full border border-zinc-700 px-3 py-1 text-xs"
        >
          {MODE_LABEL[nextMode]}로 보기
        </button>
      </header>

      {album.submitted_at && (
        <p className="flex-none bg-emerald-900/60 px-4 py-2 text-center text-sm">
          제출을 마친 앨범이에요. 별점은 더 바꿀 수 없어요.
        </p>
      )}

      {mode === "filmstrip" ? (
        <Filmstrip photos={photos} index={index} onIndexChange={setIndex} />
      ) : (
        <Grid
          photos={photos}
          onOpen={(i) => {
            setIndex(i);
            setViewMode("filmstrip");
          }}
        />
      )}
    </main>
  );
}
