"use client";

import { useEffect, useState } from "react";

type State = {
  src: string;
  progress: number | null; // 0–1, 전체 크기를 모르면 null
  done: boolean;
  failed: boolean;
};

// 사진을 직접 받으면서 몇 % 받았는지 센다 (일반 img 태그는 진행률을 알려주지 않아서)
// 다 받으면 브라우저에 저장돼 있어서, 같은 주소로 img를 띄울 때 다시 받지 않는다
export function useImageProgress(src: string, enabled: boolean) {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(src, { signal: controller.signal });
        if (!res.ok || !res.body) throw new Error("사진을 받지 못함");
        const total = Number(res.headers.get("content-length")) || 0;
        const reader = res.body.getReader();
        let received = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          received += value.length;
          setState({ src, progress: total ? received / total : null, done: false, failed: false });
        }
        setState({ src, progress: 1, done: true, failed: false });
      } catch {
        // 실패하면 일반 방식으로 사진을 띄운다
        if (!controller.signal.aborted) setState({ src, progress: null, done: false, failed: true });
      }
    })();

    return () => controller.abort();
  }, [src, enabled]);

  // 다른 사진의 진행 상황이면 무시 (사진이 바뀐 직후)
  const current = state?.src === src ? state : null;
  return {
    progress: current ? current.progress : 0,
    done: current?.done ?? false,
    failed: current?.failed ?? false,
  };
}
