"use client";

import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

export interface UploadResult {
  url: string;
  key?: string;
  original_size?: number;
  compressed_size?: number;
  saved_pct?: number;
  mime_type?: string;
  original_name?: string;
  asset_type?: 'image' | 'video';
}

interface UseImageUploadOptions {
  /** Called with the upload result on success */
  onSuccess?: (result: UploadResult) => void;
  /** Called with the error on failure */
  onError?: (error: Error) => void;
  /** Label shown in toasts, e.g. "Banner image", "Hero illustration" */
  label?: string;
}

/**
 * Reusable hook for image uploads with accurate staged toast notifications.
 *
 * Stages:
 *   1. "Uploading <label>…"          — immediately on call
 *   2. "Compressing & converting…"   — after ~300ms (simulates server processing)
 *   3. "Done — saved X% (WebP)"      — on success
 *   4. "Upload failed"               — on error
 *
 * Usage:
 *   const { upload, uploading } = useImageUpload({ label: 'Banner image', onSuccess: (r) => setUrl(r.url) });
 *   <input type="file" onChange={(e) => upload(e.target.files?.[0], uploadFn)} />
 */
export function useImageUpload({ onSuccess, onError, label = 'Image' }: UseImageUploadOptions = {}) {
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(
    async (
      file: File | null | undefined,
      uploadFn: (file: File) => Promise<UploadResult>
    ) => {
      if (!file) return;

      setUploading(true);

      // Stage 1 — uploading toast (persistent until we dismiss it)
      const { id: toastId, dismiss } = toast({
        title: `Uploading ${label}…`,
        description: 'Sending to server',
        duration: 60000, // keep open until we update it
      });

      // Stage 2 — after a short delay, update to show compression is happening
      const compressionTimer = setTimeout(() => {
        dismiss();
        toast({
          title: `Compressing & converting to WebP…`,
          description: `Optimising ${label.toLowerCase()} for fastest loading`,
          duration: 60000,
        });
      }, 400);

      try {
        const result = await uploadFn(file);

        clearTimeout(compressionTimer);
        dismiss();

        // Stage 3 — success with accurate stats from server
        const isImage = result.mime_type?.startsWith('image/') ?? true;
        const savedPct = result.saved_pct ?? 0;
        const originalKB = result.original_size ? Math.round(result.original_size / 1024) : null;
        const compressedKB = result.compressed_size ? Math.round(result.compressed_size / 1024) : null;

        let description = `${label} uploaded successfully`;
        if (isImage && savedPct > 0 && originalKB && compressedKB) {
          description = `${originalKB}KB → ${compressedKB}KB · saved ${savedPct}% · WebP`;
        } else if (isImage && savedPct > 0) {
          description = `Saved ${savedPct}% · converted to WebP`;
        }

        toast({
          title: `✓ ${label} ready`,
          description,
          duration: 4000,
        });

        onSuccess?.(result);
      } catch (error) {
        clearTimeout(compressionTimer);
        dismiss();

        const err = error instanceof Error ? error : new Error('Upload failed');

        toast({
          title: `Upload failed`,
          description: err.message || `Could not upload ${label.toLowerCase()}. Please try again.`,
          variant: 'destructive',
          duration: 5000,
        });

        onError?.(err);
      } finally {
        setUploading(false);
      }
    },
    [label, onSuccess, onError]
  );

  return { upload, uploading };
}
