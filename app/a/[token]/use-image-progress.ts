"use client";

import { useEffect, useState } from "react";

type State = {
  src: string;
  url: string | null; // 다 받은 사진 (브라우저 안의 임시 주소)
  progress: number | null; // 0–1, 전체 크기를 모르면 null
  failed: boolean;
};

// 사진을 직접 조금씩 받으면서 몇 % 받았는지 센다 (일반 img 태그는 진행률을 알려주지 않아서)
// 다 받은 사진을 그대로 보여주므로 두 번 받지 않는다
export function useImageProgress(src: string, enabled: boolean) {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let url: string | null = null;

    (async () => {
      try {
        const res = await fetch(src, { signal: controller.signal });
        if (!res.ok || !res.body) throw new Error("사진을 받지 못함");
        const total = Number(res.headers.get("content-length")) || 0;
        const reader = res.body.getReader();
        const chunks: Uint8Array<ArrayBuffer>[] = [];
        let received = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value as Uint8Array<ArrayBuffer>);
          received += value.length;
          setState({ src, url: null, progress: total ? received / total : null, failed: false });
        }
        url = URL.createObjectURL(new Blob(chunks, { type: res.headers.get("content-type") ?? "image/jpeg" }));
        setState({ src, url, progress: 1, failed: false });
      } catch {
        // 실패하면 일반 방식으로 사진을 띄운다
        if (!controller.signal.aborted) setState({ src, url: null, progress: null, failed: true });
      }
    })();

    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [src, enabled]);

  // 다른 사진의 진행 상황이면 무시 (사진이 바뀐 직후)
  const current = state?.src === src ? state : null;
  return { url: current?.url ?? null, progress: current ? current.progress : 0, failed: current?.failed ?? false };
}
