"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SharedAlbum } from "./types";

const SAVE_DELAY_MS = 1500; // 별을 누르고 이만큼 지나면 저장

export type SaveState = "idle" | "saving" | "saved" | "error";
export type RateResult = "ok" | "limit" | "locked";

// 별점을 들고 있다가 모아서 save_ratings 함수로 저장한다
export function useRatings(token: string, album: SharedAlbum) {
  const [ratings, setRatings] = useState<Record<string, number>>(() =>
    Object.fromEntries(album.photos.map((p) => [p.id, p.rating])),
  );
  const [locked, setLocked] = useState(Boolean(album.submitted_at));
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const pending = useRef(new Map<string, number>()); // 아직 저장 안 한 별점
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const chain = useRef(Promise.resolve()); // 저장을 순서대로 (늦게 보낸 게 덮어쓰지 않게)

  const fiveCount = useMemo(
    () => Object.values(ratings).filter((r) => r === 5).length,
    [ratings],
  );

  const send = useCallback(async () => {
    if (pending.current.size === 0) return;
    const batch = [...pending.current].map(([photo_id, rating]) => ({ photo_id, rating }));
    pending.current.clear();
    setSaveState("saving");

    // 실패한 별점은 다음에 다시 보낸다 (그사이 새로 누른 값이 있으면 그걸 우선)
    const requeue = () => {
      for (const { photo_id, rating } of batch) {
        if (!pending.current.has(photo_id)) pending.current.set(photo_id, rating);
      }
      setSaveState("error");
    };

    try {
      // keepalive: 창이 닫히는 순간에도 요청이 끝까지 가게
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/save_ratings`,
        {
          method: "POST",
          keepalive: true,
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ p_token: token, p_ratings: batch }),
        },
      );
      if (res.ok) {
        setSaveState("saved");
        return;
      }
      const error = await res.json().catch(() => ({}));
      if (error.message === "ALREADY_SUBMITTED") {
        setLocked(true);
        setSaveState("idle");
      } else {
        requeue();
      }
    } catch {
      requeue();
    }
  }, [token]);

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    chain.current = chain.current.then(send);
    return chain.current;
  }, [send]);

  // 다른 앱으로 가거나 창을 닫을 때 저장
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
    };
  }, [flush]);

  function rate(photoId: string, stars: number): RateResult {
    if (locked) return "locked";
    const current = ratings[photoId] ?? 0;
    const next = current === stars ? 0 : stars; // 같은 별을 다시 누르면 취소

    if (next === 5 && current !== 5 && fiveCount >= album.five_star_limit) {
      return "limit";
    }

    setRatings((prev) => ({ ...prev, [photoId]: next }));
    pending.current.set(photoId, next);
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY_MS);
    return "ok";
  }

  return { ratings, rate, flush, fiveCount, locked, saveState };
}

export type RatingsApi = ReturnType<typeof useRatings>;
