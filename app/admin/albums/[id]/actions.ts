"use server";

import { refresh } from "next/cache";
import { requireAuthor } from "@/lib/auth";

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

// 5점 한도 정하기 (null이면 사진 장수의 10%로 되돌린다)
export async function setFiveStarLimit(albumId: string, limit: number | null) {
  const { supabase } = await requireAuthor();
  if (limit !== null && (!Number.isInteger(limit) || limit < 1 || limit > 500)) {
    return { error: "1–500 사이의 숫자로 입력해 주세요." };
  }
  const { error } = await supabase.from("albums").update({ five_star_limit: limit }).eq("id", albumId);
  if (error) return { error: "저장하지 못했어요. 다시 시도해 주세요." };
  refresh();
  return { error: null };
}
