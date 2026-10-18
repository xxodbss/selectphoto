import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAuthor } from "@/lib/auth";
import { StatusBadge } from "../../status-badge";
import { CopyLinkButton } from "./copy-link-button";

export default function AlbumPage({ params }: PageProps<"/admin/albums/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <Link href="/admin" className="text-sm underline">
        ← 내 앨범
      </Link>
      {/* 주소 속 ID와 로그인 정보는 요청 때마다 읽으므로 Suspense 안에 둔다 */}
      <Suspense fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}>
        {params.then(({ id }) => (
          <AlbumDetail id={id} />
        ))}
      </Suspense>
    </main>
  );
}

async function AlbumDetail({ id }: { id: string }) {
  const { supabase } = await requireAuthor();
  const { data: album } = await supabase
    .from("albums")
    .select("title, share_token, five_star_limit, submitted_at, photos(count)")
    .eq("id", id)
    .maybeSingle();

  // 없는 앨범이거나 내 앨범이 아니면 (ID 형식이 틀려도 여기로 옴)
  if (!album) {
    notFound();
  }

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">{album.title}</h1>
        <StatusBadge submitted={Boolean(album.submitted_at)} />
      </div>
      <p className="text-sm text-zinc-500">
        사진 {album.photos[0]?.count ?? 0}장 · 5점 최대 {album.five_star_limit}장
      </p>
      <CopyLinkButton token={album.share_token} />
      <p className="text-zinc-600 dark:text-zinc-400">사진 업로드는 다음 단계에서 추가돼요.</p>
    </>
  );
}
