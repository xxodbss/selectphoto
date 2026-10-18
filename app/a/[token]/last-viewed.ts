"use client";

import { useSyncExternalStore } from "react";

// 앨범마다 마지막에 보던 사진을 그 기기에 기억한다 (사진 순서가 바뀌어도 찾을 수 있게 사진 id로)
// 저장이 막힌 브라우저면 그냥 첫 사진부터 보여준다
const key = (token: string) => `selectphoto:last-photo:${token}`;

export function readLastPhoto(token: string) {
  try {
    return localStorage.getItem(key(token));
  } catch {
    return null;
  }
}

export function saveLastPhoto(token: string, photoId: string) {
  try {
    localStorage.setItem(key(token), photoId);
  } catch {}
}

// 휴대폰에서 화면이 준비됐는지 (서버에서 그릴 때는 false)
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
