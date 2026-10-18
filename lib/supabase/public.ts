import { createClient } from "@supabase/supabase-js";

// 로그인과 상관없는 모델 화면용 연결 (쿠키를 읽지 않음)
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
}
