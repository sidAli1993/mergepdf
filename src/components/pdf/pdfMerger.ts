'use client';

import { PDFDocument } from 'pdf-lib';
import type { PdfFile } from './PdfFileCard';

export async function mergePdfs(pdfFiles: PdfFile[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const pdfFile of pdfFiles) {
    const arrayBuffer = await pdfFile.file.arrayBuffer();
    const srcPdf = await PDFDocument.load(arrayBuffer);
    const pages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
    pages.forEach((page) => mergedPdf.addPage(page));
  }

  return mergedPdf.save();
}

export function downloadPdf(bytes: Uint8Array, fileName: string = 'merged.pdf') {
  const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
