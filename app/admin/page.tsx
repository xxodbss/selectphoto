import Link from "next/link";
import { Suspense } from "react";
import { requireAuthor } from "@/lib/auth";
import { effectiveFiveStarLimit } from "@/lib/five-star";
import { logout } from "./actions";
import { AlbumForm } from "./album-form";
import { StatusBadge } from "./status-badge";

export default function AdminPage() {
  return (
    // PC에서는 왼쪽 칸에 목록·로그아웃이 있으므로 새 앨범 양식만 보인다
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8 lg:py-12">
      <h1 className="text-2xl font-bold lg:hidden">내 앨범</h1>
      {/* 로그인 정보는 요청 때마다 읽으므로 Suspense 안에 둔다 */}
      <Suspense fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}>
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
      <span className="text-zinc-600 dark:text-zinc-400">{email}</span>
      <form action={logout}>
        <button type="submit" className="underline">
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
    return <p className="text-zinc-600 dark:text-zinc-400">아직 앨범이 없어요.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {albums.map((album) => (
        <li key={album.id}>
          <Link
            href={`/admin/albums/${album.id}`}
            className="flex items-center justify-between rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div className="flex flex-col gap-1">
              <span className="font-semibold">{album.title}</span>
              <span className="text-sm text-zinc-500">
                사진 {album.photos[0]?.count ?? 0}장 · 5점 최대{" "}
                {effectiveFiveStarLimit(album.five_star_limit, album.photos[0]?.count ?? 0)}장
              </span>
            </div>
            <StatusBadge submitted={Boolean(album.submitted_at)} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
