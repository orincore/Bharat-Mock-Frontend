/**
 * Cloudflare Image Resizing proxy for R2-hosted media.
 *
 * How it works:
 *   https://bharatmock.com/cdn-cgi/image/<options>/<original-r2-url>
 *
 * Cloudflare automatically compresses, converts to WebP/AVIF, and resizes
 * on the fly — no re-uploading needed. Results are cached at the edge.
 *
 * Requirements:
 *   - Enable "Image Resizing" in Cloudflare Dashboard → Speed → Optimization
 *   - Your domain must be proxied through Cloudflare (orange cloud)
 */

const CF_PROXY_BASE = 'https://bharatmock.com/cdn-cgi/image';

export interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;   // 1-100, default 85
  format?: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto';
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
}

const R2_DOMAIN = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';

const isR2Url = (url: string): boolean => {
  if (!url) return false;
  return (
    url.includes('.r2.cloudflarestorage.com') ||
    url.includes('.r2.dev') ||
    (R2_DOMAIN.length > 0 && url.startsWith(R2_DOMAIN))
  );
};

/**
 * Returns an optimized image URL via Cloudflare Image Resizing.
 * Falls back to the original URL if:
 *  - Not an R2 URL (external images, SVGs, etc.)
 *  - Running in development (no CF proxy available)
 *  - URL is empty/null
 */
export const getOptimizedImageUrl = (
  url: string | null | undefined,
  options: ImageOptions = {}
): string => {
  if (!url) return '';

  // Don't proxy SVGs, GIFs, or non-R2 URLs
  if (!isR2Url(url) || url.endsWith('.svg') || url.endsWith('.gif')) {
    return url;
  }

  // Skip in local dev — CF proxy only works on the live domain
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return url;
  }

  const {
    width,
    height,
    quality = 85,
    format = 'auto',  // auto = WebP for Chrome, AVIF for supported browsers
    fit = 'scale-down',
  } = options;

  const parts: string[] = [`quality=${quality}`, `format=${format}`, `fit=${fit}`];
  if (width)  parts.push(`width=${width}`);
  if (height) parts.push(`height=${height}`);

  return `${CF_PROXY_BASE}/${parts.join(',')}/${url}`;
};

// Preset helpers for common use cases
export const thumbnailUrl  = (url: string) => getOptimizedImageUrl(url, { width: 400,  quality: 82, format: 'auto' });
export const logoUrl       = (url: string) => getOptimizedImageUrl(url, { width: 128,  quality: 85, format: 'auto' });
export const bannerUrl     = (url: string) => getOptimizedImageUrl(url, { width: 1200, quality: 80, format: 'auto' });
export const avatarUrl     = (url: string) => getOptimizedImageUrl(url, { width: 96,   quality: 85, format: 'auto' });
export const cardImageUrl  = (url: string) => getOptimizedImageUrl(url, { width: 600,  quality: 82, format: 'auto' });
