"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SharedAlbum } from "./types";

export type SaveState = "idle" | "saving" | "saved" | "error";

export const SAVE_LABEL: Record<SaveState, string> = {
  idle: "",
  saving: "저장 중…",
  saved: "저장됨",
  error: "저장 실패 · 인터넷이 연결되면 다시 보낼게요",
};

export type RateResult = "ok" | "limit" | "locked";
// toggle: 같은 별을 다시 누르면 취소(탭) / set: 그 점수로 정하기(슬라이드)
export type RateMode = "toggle" | "set";
export type FinishResult = "ok" | "save-failed" | "error";

type Change = { rating: number; at: number }; // at: 별점을 누른 시각(밀리초)
type SendResult = "ok" | "retry" | "limit" | "locked" | "dropped";

const NOTICE_MS = 3500;
const RETRY_FIRST_MS = 3000;
const RETRY_MAX_MS = 30000;

// 모델용 함수 호출 (keepalive: 창이 닫히는 순간에도 요청이 끝까지 가게)
// 인터넷 오류·서버 오류(5xx)는 다시 시도할 수 있고, 그 밖의 거절(4xx)은 다시 보내도 같다
async function callRpc(fn: string, body: object) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      keepalive: true,
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (res.ok) return { ok: true as const, data: await res.json().catch(() => null) };
    const error = await res.json().catch(() => ({}));
    return { ok: false as const, message: String(error.message ?? ""), retryable: res.status >= 500 };
  } catch {
    return { ok: false as const, message: "", retryable: true };
  }
}

// 아직 서버에 저장되지 않은 별점을 기기에 잠깐 보관 (창을 닫아도 다음에 다시 보내게)
const unsavedKey = (token: string) => `selectphoto:unsaved:${token}`;

function loadUnsaved(token: string): Record<string, Change> {
  try {
    return JSON.parse(localStorage.getItem(unsavedKey(token)) ?? "{}");
  } catch {
    return {};
  }
}

function storeUnsaved(token: string, unsaved: Map<string, Change>) {
  try {
    if (unsaved.size === 0) localStorage.removeItem(unsavedKey(token));
    else localStorage.setItem(unsavedKey(token), JSON.stringify(Object.fromEntries(unsaved)));
  } catch {}
}

// 별점을 누르는 즉시 save_ratings로 저장한다
// - 누른 시각을 같이 보내서, 늦게 도착한 옛 요청은 서버가 무시한다
// - 실패하면 기기에 보관해 두고 인터넷이 돌아오거나 화면에 돌아오면 다시 보낸다
export function useRatings(token: string, album: SharedAlbum) {
  // 처음 값: 서버 별점에, 기기에 보관한 더 새로운 별점을 덮어씀
  const [initial] = useState(() => {
    const stored = album.submitted_at ? {} : loadUnsaved(token);
    const ratings: Record<string, number> = {};
    const unsaved = new Map<string, Change>();
    let lastAt = 0;
    for (const p of album.photos) {
      ratings[p.id] = p.rating;
      lastAt = Math.max(lastAt, p.rated_at);
      const change = stored[p.id];
      if (change && change.at > p.rated_at) {
        ratings[p.id] = change.rating;
        unsaved.set(p.id, change);
        lastAt = Math.max(lastAt, change.at);
      }
    }
    return { ratings, unsaved, lastAt };
  });

  const [ratings, setRatings] = useState(initial.ratings);
  const [locked, setLocked] = useState(Boolean(album.submitted_at));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [notice, setNotice] = useState<string | null>(null);

  const latest = useRef(initial.ratings);
  const unsaved = useRef(initial.unsaved);
  const lastAt = useRef(initial.lastAt);
  const running = useRef<Promise<boolean> | null>(null); // 지금 돌고 있는 저장
  const retryTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const retryDelay = useRef(RETRY_FIRST_MS);
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const flushRef = useRef<() => Promise<boolean>>(async () => true);

  const fiveCount = useMemo(
    () => Object.values(ratings).filter((r) => r === 5).length,
    [ratings],
  );

  function showNotice(message: string) {
    setNotice(message);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), NOTICE_MS);
  }

  function setLocal(photoId: string, rating: number) {
    latest.current = { ...latest.current, [photoId]: rating };
    setRatings(latest.current);
  }

  // 보낸 묶음 중 그사이 다시 누르지 않은 것만 '저장됨'으로 지운다
  function forget(batch: { photo_id: string; rated_at: number }[]) {
    for (const { photo_id, rated_at } of batch) {
      if (unsaved.current.get(photo_id)?.at === rated_at) unsaved.current.delete(photo_id);
    }
    storeUnsaved(token, unsaved.current);
  }

  function scheduleRetry() {
    if (retryTimer.current) return;
    retryTimer.current = setTimeout(() => {
      retryTimer.current = undefined;
      flushRef.current();
    }, retryDelay.current);
    retryDelay.current = Math.min(retryDelay.current * 2, RETRY_MAX_MS);
  }

  // 5점 한도에 걸림 (휴대폰 두 대로 동시에 5점을 준 경우 등):
  // 그 5점만 서버의 실제 값으로 되돌리고, 나머지는 다음 묶음으로 다시 보낸다
  async function undoFives(batch: { photo_id: string; rating: number; rated_at: number }[]) {
    const fresh = await callRpc("get_album", { p_token: token });
    if (!fresh.ok || !fresh.data) return false;
    const server = new Map<string, number>(
      (fresh.data as SharedAlbum).photos.map((p) => [p.id, p.rating]),
    );
    forget(batch.filter((b) => b.rating === 5));
    for (const b of batch) {
      if (b.rating === 5 && !unsaved.current.has(b.photo_id)) setLocal(b.photo_id, server.get(b.photo_id) ?? 0);
    }
    showNotice(`5점은 최대 ${album.five_star_limit}장까지예요.`);
    return true;
  }

  async function sendBatch(): Promise<SendResult> {
    const batch = [...unsaved.current].map(([photo_id, c]) => ({ photo_id, rating: c.rating, rated_at: c.at }));
    setSaveState("saving");
    const result = await callRpc("save_ratings", { p_token: token, p_ratings: batch });

    if (result.ok) {
      forget(batch);
      retryDelay.current = RETRY_FIRST_MS;
      if (unsaved.current.size === 0) setSaveState("saved");
      return "ok";
    }
    if (result.message === "ALREADY_SUBMITTED") {
      // 셀렉을 마친 앨범: 더 보낼 수 없으니 보관한 별점을 버리고 잠근다
      unsaved.current.clear();
      storeUnsaved(token, unsaved.current);
      setLocked(true);
      setSaveState("idle");
      return "locked";
    }
    if (result.message === "FIVE_STAR_LIMIT") {
      if (await undoFives(batch)) return "limit";
    } else if (!result.retryable) {
      // 다시 보내도 똑같이 거절되는 요청은 버린다 (계속 붙잡고 있으면 다른 별점까지 막힘)
      forget(batch);
      setSaveState("error");
      return "dropped";
    }
    setSaveState("error");
    scheduleRetry();
    return "retry";
  }

  // 보관한 별점을 다 보낼 때까지 묶어서 보낸다 (한 번에 하나씩만 돌아서 순서가 꼬이지 않게)
  function flush(): Promise<boolean> {
    if (running.current) return running.current;
    running.current = (async () => {
      try {
        while (unsaved.current.size > 0) {
          const result = await sendBatch();
          if (result === "retry" || result === "locked") return false;
        }
        return true;
      } finally {
        running.current = null;
      }
    })();
    return running.current;
  }

  // 나갈 때: 기다리지 않고 보관한 별점을 바로 보낸다 (중복으로 가도 서버가 시각으로 걸러냄)
  function sendNow() {
    if (unsaved.current.size === 0) return;
    const batch = [...unsaved.current].map(([photo_id, c]) => ({ photo_id, rating: c.rating, rated_at: c.at }));
    callRpc("save_ratings", { p_token: token, p_ratings: batch }).then((r) => r.ok && forget(batch));
  }

  useEffect(() => {
    flushRef.current = flush;
  });

  // 열었을 때 기기에 보관해 둔 별점이 있으면 바로 보낸다
  useEffect(() => {
    if (unsaved.current.size > 0) flushRef.current();
  }, []);

  // 인터넷이 돌아오거나 화면에 돌아오면 다시 보내고, 나갈 때는 바로 보낸다
  useEffect(() => {
    const onOnline = () => flushRef.current();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") sendNow();
      else flushRef.current();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", sendNow);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", sendNow);
    };
  });

  function rate(photoId: string, stars: number, mode: RateMode = "toggle"): RateResult {
    if (locked) return "locked";
    const current = ratings[photoId] ?? 0;
    const next = mode === "toggle" && current === stars ? 0 : stars;
    if (next === current) return "ok";

    if (next === 5 && current !== 5 && fiveCount >= album.five_star_limit) {
      showNotice(`5점은 최대 ${album.five_star_limit}장까지예요.`);
      return "limit";
    }

    // 같은 밀리초에 두 번 눌러도 순서가 지켜지게 항상 앞보다 큰 시각
    const at = Math.max(Date.now(), lastAt.current + 1);
    lastAt.current = at;
    setLocal(photoId, next);
    unsaved.current.set(photoId, { rating: next, at });
    storeUnsaved(token, unsaved.current);
    flush();
    return "ok";
  }

  // "다 골랐어요": 보관한 별점이 모두 저장된 걸 확인한 뒤에만 잠근다
  async function finish(): Promise<FinishResult> {
    if (!(await flush()) || unsaved.current.size > 0) return "save-failed";
    const result = await callRpc("submit_album", { p_token: token });
    // 이미 마친 앨범이어도 결과는 같다
    if (result.ok || result.message === "CANNOT_SUBMIT") {
      setLocked(true);
      return "ok";
    }
    return "error";
  }

  return { ratings, rate, flush, finish, fiveCount, locked, saveState, notice };
}

export type RatingsApi = ReturnType<typeof useRatings>;
