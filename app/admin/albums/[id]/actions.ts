"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthor } from "@/lib/auth";

const REMOVE_CHUNK = 500; // 저장소 파일을 한 번에 지우는 개수

// 셀렉 다시 열기: 별점은 그대로 두고 모델이 다시 바꿀 수 있게
export async function reopenAlbum(albumId: string) {
  const { supabase } = await requireAuthor();
  await supabase.from("albums").update({ submitted_at: null }).eq("id", albumId);
  refresh();
}

// 사진 지우기: 저장소 파일(크게 보기용·썸네일)과 표의 줄을 함께 지우고 순서를 다시 매긴다
export async function deletePhotos(albumId: string, photoIds: string[]) {
  const { supabase } = await requireAuthor();
  if (photoIds.length === 0) return { error: null };

  // 보안 규칙 때문에 내 앨범의 사진만 나온다
  const { data: photos } = await supabase
    .from("photos")
    .select("id, storage_path, thumb_path")
    .eq("album_id", albumId)
    .in("id", photoIds);
  if (!photos?.length) return { error: "지울 사진을 찾지 못했어요." };

  const paths = photos.flatMap((p) => [p.storage_path, p.thumb_path]);
  const removed = await supabase.storage.from("photos").remove(paths);
  if (removed.error) return { error: "사진 파일을 지우지 못했어요. 다시 시도해 주세요." };

  const { error } = await supabase
    .from("photos")
    .delete()
    .in("id", photos.map((p) => p.id));
  if (error) return { error: "사진 목록에서 지우지 못했어요. 다시 시도해 주세요." };

  await supabase.rpc("reorder_photos", { p_album_id: albumId });
  refresh();
  return { error: null };
}

// 앨범 지우기: 저장소 파일을 먼저 다 지우고, 성공했을 때만 앨범을 지운다
// (사진 목록과 별점은 앨범을 지우면 함께 지워짐)
export async function deleteAlbum(albumId: string) {
  const { supabase } = await requireAuthor();

  const { data: photos, error: listError } = await supabase
    .from("photos")
    .select("storage_path, thumb_path")
    .eq("album_id", albumId);
  if (listError) return { error: "앨범을 지우지 못했어요. 다시 시도해 주세요." };

  const paths = (photos ?? []).flatMap((p) => [p.storage_path, p.thumb_path]);
  for (let i = 0; i < paths.length; i += REMOVE_CHUNK) {
    const removed = await supabase.storage.from("photos").remove(paths.slice(i, i + REMOVE_CHUNK));
    if (removed.error) return { error: "사진 파일을 지우지 못했어요. 다시 시도해 주세요." };
  }

  const { error } = await supabase.from("albums").delete().eq("id", albumId);
  if (error) return { error: "앨범을 지우지 못했어요. 다시 시도해 주세요." };

  // 왼쪽 앨범 목록에서도 빠지게
  revalidatePath("/admin", "layout");
  redirect("/admin");
}
