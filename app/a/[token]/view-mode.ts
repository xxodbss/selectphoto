"use client";

import { useSyncExternalStore } from "react";

// 모델이 고른 보기 방식을 그 기기에 기억한다 (저장이 막힌 브라우저면 이번 방문 동안만)
export const VIEW_MODES = ["filmstrip", "grid"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

const KEY = "selectphoto:view-mode";
const listeners = new Set<() => void>();
let memoryMode: ViewMode = "filmstrip";

function isViewMode(value: unknown): value is ViewMode {
  return VIEW_MODES.includes(value as ViewMode);
}

function getSnapshot(): ViewMode {
  try {
    const stored = localStorage.getItem(KEY);
    if (isViewMode(stored)) return stored;
  } catch {}
  return memoryMode;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function setViewMode(mode: ViewMode) {
  memoryMode = mode;
  try {
    localStorage.setItem(KEY, mode);
  } catch {}
  listeners.forEach((listener) => listener());
}

export function useViewMode() {
  // 서버에서 그릴 때는 기본값(필름스트립)
  return useSyncExternalStore(subscribe, getSnapshot, () => "filmstrip" as const);
}
