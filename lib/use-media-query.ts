"use client";

import { useSyncExternalStore } from "react";

// 화면 폭 조건이 맞는지 (서버에서 그릴 때는 휴대폰 기준 false)
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (callback) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", callback);
      return () => media.removeEventListener("change", callback);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

// PC 배치로 바꾸는 기준 (Tailwind의 lg와 같은 1024px)
export function useIsDesktop() {
  return useMediaQuery("(min-width: 1024px)");
}
