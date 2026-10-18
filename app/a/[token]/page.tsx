import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { SelectApp } from "./select-app";
import type { SharedAlbum } from "./types";

// 공유 링크가 검색 엔진에 잡히지 않게
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// 휴대폰 상태 표시줄도 배경과 같은 회색으로
export const viewport: Viewport = {
  themeColor: "rgb(50, 50, 50)",
};

export default function SharedAlbumPage({ params }: PageProps<"/a/[token]">) {
  return (
    <Suspense
      fallback={
        <main className="fixed inset-0 flex items-center justify-center bg-bridge text-sm text-zinc-400">
          사진을 불러오는 중…
        </main>
      }
    >
      {params.then(({ token }) => (
        <AlbumLoader token={token} />
      ))}
    </Suspense>
  );
}

async function AlbumLoader({ token }: { token: string }) {
  const { data } = await createPublicClient().rpc("get_album", { p_token: token });

  // 코드가 한 글자라도 틀리면 '없는 앨범'
  if (!data) {
    notFound();
  }
  return <SelectApp album={data as SharedAlbum} />;
}
