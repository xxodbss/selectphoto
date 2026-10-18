"use client";

import { useState } from "react";
import { Filmstrip } from "./filmstrip";
import { FinishSheet } from "./finish-sheet";
import { Grid } from "./grid";
import type { SharedAlbum } from "./types";
import { useRatings } from "./use-ratings";
import { setViewMode, useViewMode } from "./view-mode";

export function SelectApp({ token, album }: { token: string; album: SharedAlbum }) {
  const mode = useViewMode();
  const [index, setIndex] = useState(0);
  const ratings = useRatings(token, album);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [justFinished, setJustFinished] = useState(false);
  const { photos } = album;

  // 사진을 넘길 때마다 저장
  function changeIndex(i: number) {
    setIndex(i);
    ratings.flush();
  }

  if (photos.length === 0) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-bridge px-4 text-center text-zinc-300">
        아직 사진이 없어요. 작가님이 사진을 올리면 다시 열어 주세요.
      </main>
    );
  }

  return (
    // 화면 전체를 고정해서 위아래로 밀어도 페이지가 움직이지 않게
    // PC에서도 휴대폰 화면을 가운데에 휴대폰 폭으로 보여준다
    <div className="fixed inset-0 flex justify-center overscroll-none bg-bridge text-zinc-100">
      <main className="flex h-full w-full max-w-[480px] flex-col lg:border-x lg:border-black/30">
        <header className="flex h-12 flex-none items-center justify-between gap-3 px-4">
          <span className="min-w-0 truncate text-sm">
            {mode === "filmstrip" ? `${index + 1} / ${photos.length}` : album.title}
          </span>
          <span
            className={`flex-none text-sm ${
              ratings.fiveCount >= album.five_star_limit ? "text-amber-400" : ""
            }`}
          >
            ★5점 {ratings.fiveCount}/{album.five_star_limit}
          </span>
          {/* 필름스트립 → 격자는 버튼, 격자 → 필름스트립은 사진을 탭 */}
          {mode === "filmstrip" ? (
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className="flex-none rounded-full border border-zinc-500 px-3 py-1 text-xs"
            >
              격자로 보기
            </button>
          ) : (
            // 마무리는 전체를 훑어보는 격자에서
            !ratings.locked && (
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="flex-none rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-900"
              >
                완료
              </button>
            )
          )}
        </header>

        {ratings.locked && (
          <p className="flex-none bg-emerald-900/60 px-4 py-2 text-center text-sm">
            셀렉을 마친 앨범이에요. 별점은 더 바꿀 수 없어요.
          </p>
        )}

        {mode === "filmstrip" ? (
          <Filmstrip
            photos={photos}
            index={index}
            onIndexChange={changeIndex}
            ratings={ratings}
            fiveStarLimit={album.five_star_limit}
            keyboardEnabled={!sheetOpen && !justFinished}
          />
        ) : (
          <Grid
            photos={photos}
            ratings={ratings.ratings}
            currentIndex={index}
            onOpen={(i) => {
              setIndex(i);
              setViewMode("filmstrip");
            }}
          />
        )}

      </main>

      {sheetOpen && (
        <FinishSheet
          ratings={ratings}
          fiveStarLimit={album.five_star_limit}
          onClose={() => setSheetOpen(false)}
          onDone={() => {
            setSheetOpen(false);
            setJustFinished(true);
          }}
        />
      )}

      {justFinished && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-bridge px-6 text-center">
          <h2 className="text-xl font-bold">셀렉을 마쳤어요</h2>
          <p className="text-zinc-300">작가님께 카톡으로 다 골랐다고 알려 주세요.</p>
          <button
            type="button"
            onClick={() => setJustFinished(false)}
            className="rounded-lg border border-zinc-500 px-5 py-3 text-sm"
          >
            고른 사진 다시 보기
          </button>
        </div>
      )}
    </div>
  );
}
