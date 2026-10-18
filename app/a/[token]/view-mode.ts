"use client";

import { useSyncExternalStore } from "react";

// 보기 방식: 링크로 들어오면 항상 격자로 시작 (기기에 기억하지 않음)
export type ViewMode = "filmstrip" | "grid";

const listeners = new Set<() => void>();
let currentMode: ViewMode = "grid";

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function setViewMode(mode: ViewMode) {
  currentMode = mode;
  listeners.forEach((listener) => listener());
}

export function useViewMode() {
  return useSyncExternalStore(
    subscribe,
    () => currentMode,
    () => "grid" as const,
  );
}
