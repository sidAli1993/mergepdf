'use client';

import { PDFDocument, degrees } from 'pdf-lib';

/** Load a File into a pdf-lib PDFDocument */
export async function loadPdfDocument(file: File): Promise<PDFDocument> {
  const arrayBuffer = await file.arrayBuffer();
  return PDFDocument.load(arrayBuffer);
}

/** Trigger a browser download of a Uint8Array as a PDF */
export function downloadPdf(bytes: Uint8Array, fileName = 'document.pdf') {
  const blob = new Blob(
    [bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer],
    { type: 'application/pdf' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Render all pages of a PDF file as thumbnail dataURLs using pdfjs */
export async function renderAllThumbnails(
  file: File,
  scale = 0.25,
  onProgress?: (index: number, total: number) => void
): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const total = pdf.numPages;
  const thumbnails: string[] = [];

  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, canvas, viewport }).promise;
    thumbnails.push(canvas.toDataURL());
    onProgress?.(i, total);
  }

  return thumbnails;
}

/** Parse a page-range string like "1-3, 5, 7-9" into 0-based indices */
export function parsePageRanges(input: string, maxPages: number): number[] {
  const indices = new Set<number>();
  const parts = input.split(',').map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    const range = part.split('-').map((s) => parseInt(s.trim(), 10));
    if (range.length === 1) {
      const n = range[0];
      if (n >= 1 && n <= maxPages) indices.add(n - 1);
    } else if (range.length === 2) {
      const [start, end] = range;
      for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
        indices.add(i - 1);
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

export { degrees };
