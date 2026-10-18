// 브라우저에서 사진을 줄여 JPEG로 만든다 (원본은 올리지 않음)

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

function toJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("JPEG 변환 실패"))),
      "image/jpeg",
      quality,
    ),
  );
}

export async function makePreviews(file: File) {
  // 세로 사진 회전(EXIF Orientation)은 createImageBitmap이 알아서 반영한다
  const bitmap = await createImageBitmap(file);
  try {
    const full = drawScaled(bitmap, bitmap.width, bitmap.height, FULL_SIDE);
    // 썸네일은 이미 줄인 사진에서 다시 줄여야 더 깔끔하다
    const thumb = drawScaled(full, full.width, full.height, THUMB_SIDE);
    return {
      full: await toJpeg(full, 0.8),
      thumb: await toJpeg(thumb, 0.75),
    };
  } finally {
    bitmap.close();
  }
}
