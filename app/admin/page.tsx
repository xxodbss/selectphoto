import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";

export default function AdminPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">내 앨범</h1>
      {/* 로그인 정보는 요청 때마다 읽으므로 Suspense 안에 둔다 */}
      <Suspense fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}>
        <AuthorBar />
      </Suspense>
      <p className="text-zinc-600 dark:text-zinc-400">
        아직 앨범이 없어요.
      </p>
    </main>
  );
}

async function AuthorBar() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  // 관문(proxy)을 우회하더라도 여기서 한 번 더 막는다
  if (!data?.claims) {
    redirect("/login");
  }

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-600 dark:text-zinc-400">{data.claims.email}</span>
      <form action={logout}>
        <button type="submit" className="underline">
          로그아웃
        </button>
      </form>
    </div>
  );
}
