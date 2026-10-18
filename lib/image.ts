// 브라우저에서 사진을 줄여 WebP로 만든다 (원본은 올리지 않음)

const FULL_SIDE = 2000; // 크게 보기용 긴 변 (모델이 확대해 표정을 확인할 수 있게)
const THUMB_SIDE = 480; // 갤러리 3칸 목록용 긴 변

function drawScaled(source: CanvasImageSource, width: number, height: number, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);

  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("이미지 변환 실패"))),
      type,
      quality,
    ),
  );
}

// WebP를 못 만드는 브라우저는 PNG를 돌려주므로, 그때는 JPEG로 다시 만든다
async function encode(canvas: HTMLCanvasElement, webpQuality: number, jpegQuality: number) {
  const webp = await toBlob(canvas, "image/webp", webpQuality);
  if (webp.type === "image/webp") return webp;
  return toBlob(canvas, "image/jpeg", jpegQuality);
}

export function extensionOf(blob: Blob) {
  return blob.type === "image/webp" ? "webp" : "jpg";
}

export async function makePreviews(file: File) {
  // 세로 사진 회전(EXIF Orientation)은 createImageBitmap이 알아서 반영한다
  const bitmap = await createImageBitmap(file);
  try {
    const full = drawScaled(bitmap, bitmap.width, bitmap.height, FULL_SIDE);
    // 썸네일은 이미 줄인 사진에서 다시 줄여야 더 깔끔하다
    const thumb = drawScaled(full, full.width, full.height, THUMB_SIDE);
    return {
      full: await encode(full, 0.8, 0.85),
      thumb: await encode(thumb, 0.75, 0.8),
    };
  } finally {
    bitmap.close();
  }
}
