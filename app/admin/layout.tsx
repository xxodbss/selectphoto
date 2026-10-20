import Link from "next/link";
import { Suspense } from "react";
import { requireAuthor } from "@/lib/auth";
import { logout } from "./actions";
import { SidebarLinks } from "./sidebar-links";
import { ui } from "@/lib/ui";

// 작가 화면 공통 틀: PC에서는 왼쪽에 앨범 목록, 휴대폰에서는 숨김
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    // 작가 화면도 모델 화면과 같은 브릿지 회색 바탕 (색은 lib/ui.ts)
    <div className="author-page flex flex-1 bg-bridge text-zinc-100">
      <aside className="sticky top-0 hidden h-dvh w-64 flex-none flex-col gap-4 border-r border-black/30 p-4 lg:flex">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">내 앨범</h2>
          <Link href="/admin" className={ui.pill}>
            + 새 앨범
          </Link>
        </div>
        {/* 로그인 정보와 앨범 목록은 요청 때마다 읽으므로 Suspense 안에 둔다 */}
        <Suspense fallback={<p className="px-3 text-sm text-zinc-400">불러오는 중…</p>}>
          <SidebarContent />
        </Suspense>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

async function SidebarContent() {
  const { supabase, email } = await requireAuthor();
  const { data: albums } = await supabase
    .from("albums")
    .select("id, title, submitted_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <nav className="min-h-0 flex-1 overflow-y-auto">
        <SidebarLinks albums={albums ?? []} />
      </nav>
      <div className="flex flex-col gap-1 border-t border-black/30 pt-3 text-xs">
        <span className="truncate text-zinc-400">{email}</span>
        <form action={logout}>
          <button type="submit" className="text-zinc-300 underline">
            로그아웃
          </button>
        </form>
      </div>
    </>
  );
}
