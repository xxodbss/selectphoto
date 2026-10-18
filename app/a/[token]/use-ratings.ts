"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SharedAlbum } from "./types";

export type SaveState = "idle" | "saving" | "saved" | "error";
export type RateResult = "ok" | "limit" | "locked";
// toggle: 같은 별을 다시 누르면 취소(탭) / set: 그 점수로 정하기(슬라이드)
export type RateMode = "toggle" | "set";
export type FinishResult = "ok" | "save-failed" | "error";

type Batch = { photo_id: string; rating: number }[];

// 모델용 함수 호출 (keepalive: 창이 닫히는 순간에도 요청이 끝까지 가게)
async function callRpc(fn: string, body: object) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    keepalive: true,
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (res.ok) return { ok: true, message: "" };
  const error = await res.json().catch(() => ({}));
  return { ok: false, message: String(error.message ?? "") };
}

// 별을 누르는 즉시 save_ratings로 저장한다
// (카톡 인앱 브라우저는 창을 닫을 때 신호를 잘 안 줘서, 기다렸다 저장하면 빠질 수 있음)
export function useRatings(token: string, album: SharedAlbum) {
  const [ratings, setRatings] = useState<Record<string, number>>(() =>
    Object.fromEntries(album.photos.map((p) => [p.id, p.rating])),
  );
  const [locked, setLocked] = useState(Boolean(album.submitted_at));
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const latest = useRef(ratings); // 나갈 때 보낼 최신 별점
  const pending = useRef(new Map<string, number>()); // 아직 보내지 않은 별점
  const inFlight = useRef<Promise<boolean> | null>(null); // 지금 보내는 중인 요청
  const inFlightIds = useRef<string[]>([]);

  const fiveCount = useMemo(
    () => Object.values(ratings).filter((r) => r === 5).length,
    [ratings],
  );

  // 한 묶음 보내기. 실패하면 다음에 다시 보낸다 (그사이 새로 누른 값이 있으면 그걸 우선)
  const sendBatch = useCallback(
    async (batch: Batch) => {
      setSaveState("saving");
      try {
        const { ok, message } = await callRpc("save_ratings", { p_token: token, p_ratings: batch });
        if (ok) {
          if (pending.current.size === 0) setSaveState("saved");
          return true;
        }
        if (message === "ALREADY_SUBMITTED") {
          setLocked(true);
          setSaveState("idle");
          return false;
        }
      } catch {}
      for (const { photo_id, rating } of batch) {
        if (!pending.current.has(photo_id)) pending.current.set(photo_id, rating);
      }
      setSaveState("error");
      return false;
    },
    [token],
  );

  // 쌓인 별점을 보낸다. 보내는 중이면 끝난 뒤 이어서 보낸다 (순서가 뒤바뀌지 않게)
  const flush = useCallback(async (): Promise<boolean> => {
    while (inFlight.current) await inFlight.current;
    if (pending.current.size === 0) return true;

    const batch = [...pending.current].map(([photo_id, rating]) => ({ photo_id, rating }));
    pending.current.clear();
    inFlightIds.current = batch.map((b) => b.photo_id);

    const request = sendBatch(batch).finally(() => {
      inFlight.current = null;
      inFlightIds.current = [];
    });
    inFlight.current = request;
    return request;
  }, [sendBatch]);

  // 나갈 때: 기다리지 않고 보내는 중인 것까지 최신 값으로 바로 보낸다
  useEffect(() => {
    function sendNow() {
      const ids = new Set([...pending.current.keys(), ...inFlightIds.current]);
      if (ids.size === 0) return;
      const batch = [...ids].map((id) => ({ photo_id: id, rating: latest.current[id] ?? 0 }));
      pending.current.clear();
      sendBatch(batch);
    }
    const onHide = () => {
      if (document.visibilityState === "hidden") sendNow();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", sendNow);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", sendNow);
    };
  }, [sendBatch]);

  function rate(photoId: string, stars: number, mode: RateMode = "toggle"): RateResult {
    if (locked) return "locked";
    const current = ratings[photoId] ?? 0;
    const next = mode === "toggle" && current === stars ? 0 : stars;
    if (next === current) return "ok";

    if (next === 5 && current !== 5 && fiveCount >= album.five_star_limit) {
      return "limit";
    }

    const updated = { ...ratings, [photoId]: next };
    latest.current = updated;
    setRatings(updated);
    pending.current.set(photoId, next);
    flush();
    return "ok";
  }

  // "다 골랐어요": 남은 별점이 모두 저장된 걸 확인한 뒤에만 잠근다
  async function finish(): Promise<FinishResult> {
    while (inFlight.current || pending.current.size > 0) {
      if (!(await flush())) return "save-failed";
    }
    try {
      const { ok, message } = await callRpc("submit_album", { p_token: token });
      // 이미 마친 앨범이어도 결과는 같다
      if (ok || message === "CANNOT_SUBMIT") {
        setLocked(true);
        return "ok";
      }
      return "error";
    } catch {
      return "error";
    }
  }

  return { ratings, rate, flush, finish, fiveCount, locked, saveState };
}

export type RatingsApi = ReturnType<typeof useRatings>;
