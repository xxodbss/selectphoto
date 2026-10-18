import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAuthor } from "@/lib/auth";
import { StatusBadge } from "../../status-badge";
import { reopenAlbum } from "./actions";
import { CopyLinkButton } from "./copy-link-button";
import { PhotoManager } from "./photo-manager";
import { ResultPanel } from "./result-panel";
import { UploadPhotos } from "./upload-photos";

export default function AlbumPage({ params }: PageProps<"/admin/albums/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8 lg:max-w-5xl lg:px-8">
      {/* PC에서는 왼쪽 칸에 목록이 있어서 뒤로 가기가 필요 없다 */}
      <Link href="/admin" className="text-sm underline lg:hidden">
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
    .select("title, share_token, five_star_limit, submitted_at, photos(id, filename, thumb_path, sort_order, rating)")
    .eq("id", id)
    .order("sort_order", { referencedTable: "photos" })
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
        사진 {album.photos.length}장 · 5점 최대 {album.five_star_limit}장
      </p>
      {/* PC에서는 공유 링크와 업로드를 나란히 */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-4">
        <div className="flex flex-col lg:w-56 lg:flex-none">
          <CopyLinkButton token={album.share_token} />
        </div>
        <div className="lg:flex-1">
          {album.submitted_at ? (
            // 모델이 실수로 마쳤거나 다시 고르고 싶을 때 (별점은 그대로 남음)
            <form action={reopenAlbum.bind(null, id)}>
              <button type="submit" className="w-full rounded-lg border border-zinc-300 py-3 text-sm dark:border-zinc-700">
                셀렉 다시 열기
              </button>
            </form>
          ) : (
            <UploadPhotos albumId={id} />
          )}
        </div>
      </div>

      {album.photos.length > 0 && (
        <>
          <ResultPanel title={album.title} photos={album.photos} />
          {!album.submitted_at && (
            <p className="-mt-3 text-xs text-zinc-500">
              모델이 고르는 중이에요. 새로고침하면 최신 별점을 볼 수 있어요.
            </p>
          )}
        </>
      )}

      {album.photos.length > 0 && <PhotoManager albumId={id} photos={album.photos} />}
    </>
  );
}
