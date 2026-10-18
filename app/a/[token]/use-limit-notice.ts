"use client";

import { useRef, useState } from "react";
import type { RateMode, RatingsApi } from "./use-ratings";

const NOTICE_MS = 3500;

// 별점 매기기 + 5점 한도에 걸리면 안내 문구를 잠깐 보여준다
export function useLimitNotice(ratings: RatingsApi, fiveStarLimit: number) {
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function rate(photoId: string, stars: number, mode: RateMode) {
    if (ratings.rate(photoId, stars, mode) === "limit") {
      setNotice(`5점은 최대 ${fiveStarLimit}장까지예요.`);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setNotice(null), NOTICE_MS);
    }
  }

  return { notice, rate };
}
