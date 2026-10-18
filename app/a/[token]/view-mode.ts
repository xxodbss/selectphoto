"use client";

import { useSyncExternalStore } from "react";

// 보기 방식: 처음 여는 사람은 격자로 시작, 그다음부터는 마지막에 쓰던 방식을 기기에 기억
// (저장이 막힌 브라우저면 이번 방문 동안만)
export type ViewMode = "filmstrip" | "grid";

const KEY = "selectphoto:view-mode";
const DEFAULT_MODE: ViewMode = "grid";
const listeners = new Set<() => void>();
let memoryMode: ViewMode = DEFAULT_MODE;

function isViewMode(value: unknown): value is ViewMode {
  return value === "filmstrip" || value === "grid";
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
  // 서버에서 그릴 때는 기본값(격자)
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_MODE);
}
