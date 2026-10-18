"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Album = { id: string; title: string; submitted_at: string | null };

// 왼쪽 앨범 목록 (지금 보는 앨범은 강조)
export function SidebarLinks({ albums }: { albums: Album[] }) {
  const pathname = usePathname();

  if (albums.length === 0) {
    return <p className="px-3 text-sm text-zinc-500">아직 앨범이 없어요.</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {albums.map((album) => {
        const href = `/admin/albums/${album.id}`;
        const active = pathname === href;
        return (
          <li key={album.id}>
            <Link
              href={href}
              className={`flex flex-col rounded-lg px-3 py-2 ${
                active ? "bg-zinc-200 dark:bg-zinc-800" : "hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }`}
            >
              <span className="truncate text-sm font-semibold">{album.title}</span>
              <span className={`text-xs ${album.submitted_at ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-500"}`}>
                {album.submitted_at ? "셀렉 완료" : "셀렉 중"}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
