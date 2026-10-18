"use client";

import exifr from "exifr";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { makePreviews } from "@/lib/image";
import { createClient } from "@/lib/supabase/client";

const PARALLEL = 3; // 동시에 처리할 장수

type Progress = { total: number; done: number; failed: string[]; skipped: string[] };

function isJpeg(file: File) {
  return file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name);
}

async function readTakenAt(file: File) {
  try {
    const exif = await exifr.parse(file, ["DateTimeOriginal"]);
    return exif?.DateTimeOriginal instanceof Date ? exif.DateTimeOriginal.toISOString() : null;
  } catch {
    return null; // 촬영 시간이 없으면 파일명 순서로 정렬된다
  }
}

export function UploadPhotos({ albumId }: { albumId: string }) {
  const router = useRouter();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [dragging, setDragging] = useState(false);
  const uploading = progress !== null && progress.done < progress.total;

  // 업로드 중에 창을 닫으려 하면 경고
  useEffect(() => {
    if (!uploading) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [uploading]);

  async function uploadOne(file: File) {
    const supabase = createClient();
    const takenAt = await readTakenAt(file);
    const { full, thumb } = await makePreviews(file);

    const id = crypto.randomUUID();
    const storagePath = `${albumId}/${id}.jpg`;
    const thumbPath = `${albumId}/${id}_thumb.jpg`;
    // 파일 이름이 무작위라 내용이 바뀌지 않으므로 오래 캐시해도 된다
    const options = { contentType: "image/jpeg", cacheControl: "31536000" };

    const up1 = await supabase.storage.from("photos").upload(storagePath, full, options);
    if (up1.error) throw up1.error;
    const up2 = await supabase.storage.from("photos").upload(thumbPath, thumb, options);
    if (up2.error) throw up2.error;

    const { error } = await supabase.from("photos").insert({
      album_id: albumId,
      filename: file.name,
      storage_path: storagePath,
      thumb_path: thumbPath,
      taken_at: takenAt,
      sort_order: 0, // 다 올린 뒤 reorder_photos로 다시 매긴다
    });
    if (error) throw error;
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length || uploading) return;

    const all = Array.from(fileList);
    const files = all.filter(isJpeg);
    const skipped = all.filter((f) => !isJpeg(f)).map((f) => f.name);
    setProgress({ total: files.length, done: 0, failed: [], skipped });

    const queue = [...files];
    async function worker() {
      for (let file = queue.shift(); file; file = queue.shift()) {
        const name = file.name;
        try {
          await uploadOne(file);
          setProgress((p) => p && { ...p, done: p.done + 1 });
        } catch {
          setProgress((p) => p && { ...p, done: p.done + 1, failed: [...p.failed, name] });
        }
      }
    }
    await Promise.all(Array.from({ length: PARALLEL }, worker));

    await createClient().rpc("reorder_photos", { p_album_id: albumId });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed p-6 text-center ${
          dragging ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900" : "border-zinc-300 dark:border-zinc-700"
        } ${uploading ? "pointer-events-none opacity-50" : ""}`}
      >
        <span className="font-semibold">사진 올리기</span>
        <span className="text-sm text-zinc-500">
          눌러서 고르거나 여기로 끌어다 놓으세요 (JPEG, 여러 장 가능)
        </span>
        <input
          type="file"
          accept="image/jpeg"
          multiple
          disabled={uploading}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = ""; // 같은 파일을 다시 고를 수 있게
          }}
          className="hidden"
        />
      </label>

      {progress && (
        <div className="flex flex-col gap-2 text-sm">
          <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full bg-zinc-900 transition-all dark:bg-zinc-100"
              style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 100}%` }}
            />
          </div>
          <p>
            {uploading
              ? `올리는 중… ${progress.done} / ${progress.total}장 (창을 닫지 마세요)`
              : `완료: ${progress.total - progress.failed.length}장 올림`}
          </p>
          {progress.failed.length > 0 && (
            <p className="text-red-600">
              실패 {progress.failed.length}장 — 다시 올려 주세요: {progress.failed.join(", ")}
            </p>
          )}
          {progress.skipped.length > 0 && (
            <p className="text-amber-700">
              JPEG가 아니라 건너뜀 {progress.skipped.length}장: {progress.skipped.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
