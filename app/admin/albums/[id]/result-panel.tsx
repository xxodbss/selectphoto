"use client";

import { useState } from "react";
import { ui } from "@/lib/ui";

type Photo = { id: string; filename: string; rating: number };

// 셀렉 결과: 별점 높은 순 목록, 목록 복사, 브릿지용 결과 파일 내려받기
export function ResultPanel({ title, photos }: { title: string; photos: Photo[] }) {
  const [copied, setCopied] = useState(false);

  // 별점 높은 순, 같은 점수는 촬영 순서 그대로 (photos는 이미 촬영 순서)
  const sorted = [...photos].sort((a, b) => b.rating - a.rating);
  const groups = [5, 4, 3, 2, 1]
    .map((stars) => ({ stars, files: sorted.filter((p) => p.rating === stars).map((p) => p.filename) }))
    .filter((g) => g.files.length > 0);
  const unrated = photos.filter((p) => p.rating === 0).length;

  // 사람이 읽는 목록 (카톡·메모장용)
  const listText = groups.map((g) => `★${g.stars} (${g.files.length}장)\n${g.files.join("\n")}`).join("\n\n");

  async function copy() {
    await navigator.clipboard.writeText(listText);
    setCopied(true);
  }

  // 브릿지 스크립트가 읽는 파일: "별점<탭>파일명" 한 줄씩 (0점도 넣어서 기존 별점을 지운다)
  function download() {
    const lines = [
      `# selectphoto 셀렉 결과 — ${title}`,
      "# 별점<탭>파일명 (0 = 안 고름)",
      ...sorted.map((p) => `${p.rating}\t${p.filename}`),
    ];
    const blob = new Blob([lines.join("\n") + "\n"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selectphoto-결과-${title.replace(/[\\/:*?"<>|]/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    // 카드 대신 위쪽 구분선만 (모델 화면과 같은 납작한 느낌)
    <section className="flex flex-col gap-3 border-t border-black/30 pt-6">
      <h2 className="font-semibold">셀렉 결과</h2>
      <p className="text-sm text-zinc-300">
        {[...[5, 4, 3, 2, 1].map((s) => `★${s} ${photos.filter((p) => p.rating === s).length}장`), `안 고름 ${unrated}장`].join(" · ")}
      </p>

      {groups.length > 0 ? (
        <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-black/20 p-3 text-xs leading-5 text-zinc-200">
          {listText}
        </pre>
      ) : (
        <p className="text-sm text-zinc-400">아직 모델이 고른 사진이 없어요.</p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={copy}
          disabled={groups.length === 0}
          className={`flex-1 ${ui.secondary}`}
        >
          {copied ? "복사 완료!" : "목록 복사"}
        </button>
        <button
          type="button"
          onClick={download}
          className={`flex-1 text-sm ${ui.primary}`}
        >
          결과 파일 내려받기
        </button>
      </div>

      <details className="text-xs text-zinc-400">
        <summary className="cursor-pointer">브릿지에 별점 적용하는 법</summary>
        <ol className="mt-2 flex list-decimal flex-col gap-1 pl-4">
          <li>
            처음 한 번만:{" "}
            <a href="/bridge/selectphoto-apply-ratings.jsx" download className="text-zinc-200 underline">
              브릿지 스크립트 받기
            </a>{" "}
            → 브릿지 [환경 설정 → 시작 스크립트 → 내 시작 스크립트 표시]에 넣고 브릿지를 다시 켜요.
          </li>
          <li>브릿지에서 이 앨범 사진이 있는 폴더를 열어요.</li>
          <li>[도구 → selectphoto 별점 적용…]을 누르고 내려받은 결과 파일을 골라요.</li>
          <li>같은 이름의 사진(JPEG·RAW 모두)에 모델 별점이 들어가요. 안 고른 사진은 별점이 지워져요.</li>
        </ol>
      </details>
    </section>
  );
}
