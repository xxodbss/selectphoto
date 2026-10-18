import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 로그인한 작가만 통과, 아니면 로그인 화면으로 보낸다
export async function requireAuthor() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }
  return { supabase, email: data.claims.email as string | undefined };
}
