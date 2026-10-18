"use client";

import { useState } from "react";
import { CompareView } from "./compare-view";
import { Filmstrip } from "./filmstrip";
import { FinishSheet } from "./finish-sheet";
import { Grid } from "./grid";
import { readLastPhoto, saveLastPhoto, useHydrated } from "./last-viewed";
import type { SharedAlbum } from "./types";
import { useRatings } from "./use-ratings";
import { setViewMode, useViewMode } from "./view-mode";

export function SelectApp({ token, album }: { token: string; album: SharedAlbum }) {
  const mode = useViewMode();
  const hydrated = useHydrated();
  const [chosenId, setChosenId] = useState<string | null>(null);
  const ratings = useRatings(token, album);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [justFinished, setJustFinished] = useState(false);
  const [pinned, setPinned] = useState<number | null>(null); // 비교할 때 위에 고정한 사진
  // 셀렉을 마친 앨범은 별점을 준 사진만 보여준다 (전체 보기로 바꿀 수 있음)
  const [onlyRated, setOnlyRated] = useState(Boolean(album.submitted_at));
  const { photos } = album;
  const shown = onlyRated ? photos.filter((p) => (ratings.ratings[p.id] ?? 0) > 0) : photos;
  // 고른 사진만 볼 때도 격자에는 전체에서의 원래 번호를 보여준다
  const photoNumbers = new Map(photos.map((p, i) => [p.id, i + 1]));
  const comparing = pinned !== null && mode === "filmstrip";
  const pageScroll = mode === "grid";

  // 보던 사진: 처음엔 이 기기에서 마지막에 보던 사진, 그 뒤로는 고른 사진 (목록에 없으면 첫 사진)
  const currentId = chosenId ?? (hydrated ? readLastPhoto(token) : null);
  const index = Math.max(0, shown.findIndex((p) => p.id === currentId));

  // 사진을 넘길 때마다 별점 저장 + 보던 사진 기억
  function changeIndex(i: number) {
    setChosenId(shown[i].id);
    saveLastPhoto(token, shown[i].id);
    ratings.flush();
  }

  // 비교 시작: 지금 사진을 위에 고정하고, 아래는 다음 사진(마지막이면 앞 사진)
  function startCompare() {
    setPinned(index);
    changeIndex(index < shown.length - 1 ? index + 1 : index - 1);
  }

  function toggleOnlyRated() {
    setPinned(null);
    setOnlyRated(!onlyRated);
  }

  if (photos.length === 0) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-bridge px-4 text-center text-zinc-300">
        아직 사진이 없어요. 작가님이 사진을 올리면 다시 열어 주세요.
      </main>
    );
  }

  // 기억해 둔 사진은 휴대폰에서만 알 수 있어서, 화면이 준비된 뒤에 그린다
  if (!hydrated) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-bridge text-sm text-zinc-400">
        사진을 불러오는 중…
      </main>
    );
  }

  return (
    // 필름스트립·비교는 화면 전체를 고정해서 위아래로 밀어도 움직이지 않게,
    // 격자는 페이지 자체가 스크롤되게 (아이폰 상단을 누르면 맨 위로 가는 기능이 동작하도록)
    // PC에서도 휴대폰 화면을 가운데에 휴대폰 폭으로 보여준다
    <div
      className={`bridge-page flex justify-center bg-bridge text-zinc-100 ${
        pageScroll ? "min-h-dvh" : "fixed inset-0 overscroll-none"
      }`}
    >
      <main className={`flex w-full max-w-[480px] flex-col lg:border-x lg:border-black/30 ${pageScroll ? "" : "h-full"}`}>
        {/* 왼쪽·가운데·오른쪽 세 칸: 5점 개수가 항상 정가운데 오게 (격자에서는 맨 위에 붙어 있음) */}
        <header
          // 격자에서 막대를 탭하면 맨 위로 (버튼을 누른 건 제외)
          onClick={(e) => {
            if (pageScroll && !(e.target as HTMLElement).closest("button")) {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          className={`grid h-12 flex-none grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 ${
            pageScroll ? "sticky top-0 z-10 cursor-pointer bg-bridge" : ""
          }`}
        >
          <span className="min-w-0 truncate text-sm">
            {comparing
              ? "비교 중"
              : mode === "filmstrip"
                ? shown.length
                  ? `${index + 1} / ${shown.length}`
                  : ""
                : album.title}
          </span>
          <span
            className={`text-center text-sm ${
              ratings.fiveCount >= album.five_star_limit ? "text-amber-400" : ""
            }`}
          >
            ★5점 {ratings.fiveCount}/{album.five_star_limit}
          </span>
          {/* 필름스트립 → 격자는 버튼, 격자 → 필름스트립은 사진을 탭 */}
          {comparing ? (
            <button
              type="button"
              onClick={() => setPinned(null)}
              className="justify-self-end rounded-full border border-zinc-500 px-3 py-1 text-xs"
            >
              닫기
            </button>
          ) : mode === "filmstrip" ? (
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className="justify-self-end rounded-full border border-zinc-500 px-3 py-1 text-xs"
            >
              격자로 보기
            </button>
          ) : (
            // 마무리는 전체를 훑어보는 격자에서
            !ratings.locked && (
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="justify-self-end rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-900"
              >
                완료
              </button>
            )
          )}
        </header>

        {ratings.locked && (
          <div className="flex flex-none items-center justify-between gap-3 bg-emerald-900/60 px-4 py-2 text-sm">
            <span>셀렉을 마친 앨범이에요</span>
            <button type="button" onClick={toggleOnlyRated} className="flex-none underline">
              {onlyRated ? "전체 보기" : "고른 사진만"}
            </button>
          </div>
        )}

        {shown.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-zinc-300">
            <p>고른 사진이 없어요.</p>
            <button type="button" onClick={toggleOnlyRated} className="rounded-full border border-zinc-500 px-4 py-2 text-sm">
              전체 보기
            </button>
          </div>
        ) : comparing ? (
          <CompareView
            key={String(onlyRated)}
            photos={shown}
            pinned={pinned}
            candidate={index}
            onCandidateChange={changeIndex}
            onPin={setPinned}
            ratings={ratings}
            keyboardEnabled={!sheetOpen && !justFinished}
            onClose={() => setPinned(null)}
          />
        ) : mode === "filmstrip" ? (
          <Filmstrip
            key={String(onlyRated)}
            photos={shown}
            index={index}
            onIndexChange={changeIndex}
            ratings={ratings}
            keyboardEnabled={!sheetOpen && !justFinished}
            onCompare={startCompare}
          />
        ) : (
          <Grid
            key={String(onlyRated)}
            photos={shown}
            photoNumbers={photoNumbers}
            hint={`${onlyRated ? "고른 사진" : "전체"} ${shown.length}장 · 사진을 누르면 ${
              ratings.locked ? "크게 볼 수 있어요." : "크게 보고 별점을 매길 수 있어요."
            }`}
            ratings={ratings.ratings}
            currentIndex={index}
            onOpen={(i) => {
              changeIndex(i);
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
            onClick={() => {
              setJustFinished(false);
              setOnlyRated(true);
            }}
            className="rounded-lg border border-zinc-500 px-5 py-3 text-sm"
          >
            고른 사진 다시 보기
          </button>
        </div>
      )}
    </div>
  );
}
