"use client";

import { useState, useTransition } from "react";
import { deleteAlbum } from "./actions";
import { ui } from "@/lib/ui";

// 앨범 지우기 (맨 아래, 한 번 더 확인)
export function DeleteAlbumButton({ albumId, title, photoCount }: { albumId: string; title: string; photoCount: number }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    const ok = confirm(
      `'${title}' 앨범을 지울까요?\n사진 ${photoCount}장과 별점이 모두 지워지고 되돌릴 수 없어요.\n모델에게 보낸 링크도 더 이상 열리지 않아요.`,
    );
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteAlbum(albumId);
      // 성공하면 내 앨범 화면으로 이동하므로 여기로 돌아오는 건 실패했을 때뿐
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2 border-t border-black/30 pt-6">
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="self-start rounded-lg border border-red-400/60 px-4 py-2 text-sm text-red-400 disabled:opacity-50"
      >
        {pending ? "지우는 중…" : "앨범 지우기"}
      </button>
      {error && (
        <p role="alert" className={ui.error}>
          {error}
        </p>
      )}
    </div>
  );
}
