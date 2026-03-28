/**
 * Image URL utilities.
 *
 * Currently returns URLs as-is from R2/CDN.
 *
 * To enable Cloudflare Image Resizing (automatic WebP/AVIF conversion):
 *   1. Go to Cloudflare Dashboard → Speed → Optimization → Image Resizing → Enable
 *   2. Set NEXT_PUBLIC_CF_IMAGE_RESIZING=true in your environment variables
 *   3. Images will automatically be served as WebP/AVIF with resizing
 */

const CF_PROXY_BASE = 'https://bharatmock.com/cdn-cgi/image';
const CF_RESIZING_ENABLED = process.env.NEXT_PUBLIC_CF_IMAGE_RESIZING === 'true';

export interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto';
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
}

export const getOptimizedImageUrl = (
  url: string | null | undefined,
  options: ImageOptions = {}
): string => {
  if (!url) return '';

  // Always return original if CF resizing is not explicitly enabled
  if (!CF_RESIZING_ENABLED) return url;

  // Don't proxy SVGs, GIFs, data URIs
  if (url.endsWith('.svg') || url.endsWith('.gif') || url.startsWith('data:')) return url;

  // Skip in local dev
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') return url;

  const {
    width,
    height,
    quality = 85,
    format = 'auto',
    fit = 'scale-down',
  } = options;

  const parts: string[] = [`quality=${quality}`, `format=${format}`, `fit=${fit}`];
  if (width)  parts.push(`width=${width}`);
  if (height) parts.push(`height=${height}`);

  return `${CF_PROXY_BASE}/${parts.join(',')}/${url}`;
};

// Preset helpers — safe to use everywhere, no-op until CF resizing is enabled
export const thumbnailUrl = (url: string) => getOptimizedImageUrl(url, { width: 400,  quality: 82, format: 'auto' });
export const logoUrl      = (url: string) => getOptimizedImageUrl(url, { width: 128,  quality: 85, format: 'auto' });
export const bannerUrl    = (url: string) => getOptimizedImageUrl(url, { width: 1200, quality: 80, format: 'auto' });
export const avatarUrl    = (url: string) => getOptimizedImageUrl(url, { width: 96,   quality: 85, format: 'auto' });
export const cardImageUrl = (url: string) => getOptimizedImageUrl(url, { width: 600,  quality: 82, format: 'auto' });
