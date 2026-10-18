"use server";

import { redirect } from "next/navigation";
import { requireAuthor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type AlbumFormState = { error: string } | null;

export async function createAlbum(
  _prev: AlbumFormState,
  formData: FormData,
): Promise<AlbumFormState> {
  const { supabase } = await requireAuthor();

  const title = String(formData.get("title") ?? "").trim();
  const limit = Number(formData.get("five_star_limit"));

  if (!title || title.length > 100) {
    return { error: "앨범 이름을 1–100자로 입력해 주세요." };
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    return { error: "5점 한도는 1–500 사이의 숫자로 입력해 주세요." };
  }

  const { data, error } = await supabase
    .from("albums")
    .insert({ title, five_star_limit: limit })
    .select("id")
    .single();

  if (error) {
    return { error: "앨범을 만들지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  redirect(`/admin/albums/${data.id}`);
}
