/**
 * Client-side image compression for admin uploads.
 *
 * Why: question/option/explanation images were uploaded to the backend at full
 * original resolution (phone photos/screenshots are routinely 2-8MB each). The
 * server-side sharp/WebP step only runs *after* the original has crossed the
 * wire, so it never helped upload time. For an exam with 200+ questions and lots
 * of media that meant hundreds of multi-MB uploads — the main reason a save took
 * 15+ minutes. Resizing + re-encoding here shrinks each image ~10-40x before it
 * leaves the browser, turning GBs of upload into tens of MB.
 *
 * The output is intentionally close to the backend's own resize targets so the
 * server pass becomes a near no-op. Anything we can't safely re-encode (SVG,
 * GIF, non-images, or a decode failure) falls back to the untouched original.
 */

export interface CompressImageOptions {
  /** Longest-edge cap in px. Images already smaller are not enlarged. */
  maxDimension?: number;
  /** WebP/JPEG quality, 0-1. */
  quality?: number;
  /** Skip compression entirely for files at or below this size (bytes). */
  skipBelowBytes?: number;
}

const DEFAULTS: Required<CompressImageOptions> = {
  maxDimension: 1600,
  quality: 0.82,
  // Small images (already-optimized icons, tiny screenshots) aren't worth a
  // decode/encode round-trip.
  skipBelowBytes: 60 * 1024,
};

// Formats we must not re-encode: SVG is vector, GIF may be animated (canvas
// would flatten it to a single frame).
const SKIP_MIME = new Set(['image/gif', 'image/svg+xml']);

function canCompress(file: File): boolean {
  if (typeof document === 'undefined') return false; // SSR guard
  if (!file.type.startsWith('image/')) return false;
  if (SKIP_MIME.has(file.type)) return false;
  if (typeof createImageBitmap !== 'function') return false;
  return true;
}

async function decode(file: File): Promise<ImageBitmap> {
  // `imageOrientation: 'from-image'` bakes EXIF rotation into the pixels so the
  // re-encoded image isn't sideways.
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return await createImageBitmap(file);
  }
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), type, quality));
}

/**
 * Resize + re-encode an image File for upload. Returns the original File
 * untouched whenever compression isn't applicable or wouldn't help.
 */
export async function compressImageForUpload(
  file: File,
  options: CompressImageOptions = {}
): Promise<File> {
  const { maxDimension, quality, skipBelowBytes } = { ...DEFAULTS, ...options };

  if (!canCompress(file) || file.size <= skipBelowBytes) {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await decode(file);
  } catch {
    return file; // undecodable — let the server deal with the original
  }

  try {
    const { width, height } = bitmap;
    if (!width || !height) return file;

    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);

    // Prefer WebP (matches the backend's output format); fall back to JPEG for
    // browsers that don't support WebP encoding.
    let blob = await encode(canvas, 'image/webp', quality);
    let ext = 'webp';
    let mime = 'image/webp';
    if (!blob || blob.type !== 'image/webp') {
      blob = await encode(canvas, 'image/jpeg', quality);
      ext = 'jpg';
      mime = 'image/jpeg';
    }

    // Only keep the compressed version if it actually saved bytes.
    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^./\\]+$/, '') || 'image';
    return new File([blob], `${baseName}.${ext}`, { type: mime, lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    bitmap.close?.();
  }
}
