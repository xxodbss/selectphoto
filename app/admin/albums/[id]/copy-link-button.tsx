"use client";

import { useState } from "react";

// 모델에게 보낼 공유 링크를 복사한다 (주소 앞부분은 지금 접속한 사이트 기준)
export function CopyLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/a/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-lg bg-zinc-900 py-3 font-semibold text-white lg:h-28 dark:bg-zinc-100 dark:text-zinc-900"
    >
      {copied ? "복사 완료!" : "공유 링크 복사"}
    </button>
  );
}
