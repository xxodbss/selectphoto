import Link from "next/link";
import { Suspense } from "react";
import { requireAuthor } from "@/lib/auth";
import { logout } from "./actions";
import { AlbumForm } from "./album-form";
import { StatusBadge } from "./status-badge";

export default function AdminPage() {
  return (
    // PC에서는 왼쪽 칸에 목록·로그아웃이 있으므로 새 앨범 양식만 보인다
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8 lg:py-12">
      <h1 className="text-2xl font-bold lg:hidden">내 앨범</h1>
      {/* 로그인 정보는 요청 때마다 읽으므로 Suspense 안에 둔다 */}
      <Suspense fallback={<p className="text-sm text-zinc-400">불러오는 중…</p>}>
        <div className="lg:hidden">
          <AuthorBar />
        </div>
        <AlbumForm />
        <div className="lg:hidden">
          <AlbumList />
        </div>
      </Suspense>
    </main>
  );
}

async function AuthorBar() {
  const { email } = await requireAuthor();

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-400">{email}</span>
      <form action={logout}>
        <button type="submit" className="text-zinc-300 underline">
          로그아웃
        </button>
      </form>
    </div>
  );
}

async function AlbumList() {
  const { supabase } = await requireAuthor();
  const { data: albums } = await supabase
    .from("albums")
    .select("id, title, five_star_limit, submitted_at, created_at, photos(count)")
    .order("created_at", { ascending: false });

  if (!albums?.length) {
    return <p className="text-zinc-400">아직 앨범이 없어요.</p>;
  }

  return (
    // 카드 대신 구분선으로 나눈 납작한 목록 (모델 화면과 같은 느낌)
    <ul className="flex flex-col border-t border-black/30">
      {albums.map((album) => (
        <li key={album.id}>
          <Link
            href={`/admin/albums/${album.id}`}
            className="flex items-center justify-between gap-3 border-b border-black/30 py-4"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <span className="truncate font-semibold">{album.title}</span>
              <span className="text-sm text-zinc-400">
                사진 {album.photos[0]?.count ?? 0}장 · 5점 최대 {album.five_star_limit}장
              </span>
            </div>
            <StatusBadge submitted={Boolean(album.submitted_at)} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
