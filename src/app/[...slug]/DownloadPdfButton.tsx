'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';

interface DownloadPdfButtonProps {
  filename: string;
  contentId: string;
}

export default function DownloadPdfButton({ filename, contentId }: DownloadPdfButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    const element = document.getElementById(contentId);
    if (!element) return;
    try {
      setLoading(true);
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: `${filename}.pdf`,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        })
        .from(element)
        .save();
    } catch (err) {
      console.error('[DownloadPdf] failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex-shrink-0 mt-1 inline-flex items-center gap-1.5 px-3 py-2 sm:px-4 rounded-full border text-xs sm:text-sm font-semibold text-white border-white/30 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      <span className="hidden sm:inline">{loading ? 'Generating…' : 'Download PDF'}</span>
      <span className="sm:hidden">{loading ? '…' : 'PDF'}</span>
    </button>
  );
}
