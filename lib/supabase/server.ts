import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 서버에서 쓰는 Supabase 연결 (로그인 정보는 쿠키로 주고받음)
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // 화면을 그리는 중에는 쿠키를 못 바꿈 — 로그인 유지 장치에서 처리
          }
        },
      },
    },
  );
}
