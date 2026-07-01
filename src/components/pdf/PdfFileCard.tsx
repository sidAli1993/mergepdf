'use client';

import React, { useEffect, useRef, useState } from 'react';
import { GripVertical, X, FileText, BookOpen } from 'lucide-react';
import styles from './PdfFileCard.module.css';

export interface PdfFile {
  id: string;
  file: File;
  pageCount?: number;
  thumbnailDataUrl?: string;
}

interface PdfFileCardProps {
  pdfFile: PdfFile;
  index: number;
  onRemove: (id: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

export const PdfFileCard: React.FC<PdfFileCardProps> = ({
  pdfFile,
  index,
  onRemove,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pageCount, setPageCount] = useState<number | undefined>(pdfFile.pageCount);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | undefined>(pdfFile.thumbnailDataUrl);

  useEffect(() => {
    let cancelled = false;

    const renderThumbnail = async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

        const arrayBuffer = await pdfFile.file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        if (cancelled) return;

        setPageCount(pdf.numPages);

        const page = await pdf.getPage(1);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: 0.3 });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        await page.render({ canvasContext: ctx, canvas, viewport }).promise;
        setThumbnailUrl(canvas.toDataURL());
      } catch (_e) {
        // silently fail — show placeholder
      }
    };

    if (!thumbnailUrl) renderThumbnail();
    return () => { cancelled = true; };
  }, [pdfFile.file, thumbnailUrl]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className={`${styles.card} ${isDragging ? styles.cardDragging : ''}`}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
      onDragEnd={onDragEnd}
    >
      <div className={styles.dragHandle} title="Drag to reorder">
        <GripVertical size={16} />
      </div>

      <div className={styles.thumbnail}>
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="PDF page preview" className={styles.thumbnailCanvas} />
        ) : (
          <div className={styles.thumbnailPlaceholder}>
            <FileText size={20} />
          </div>
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      <div className={styles.info}>
        <div className={styles.fileName}>{pdfFile.file.name}</div>
        <div className={styles.fileMeta}>{formatSize(pdfFile.file.size)}</div>
        {pageCount && (
          <div className={styles.pageCount}>
            <BookOpen size={10} />
            {pageCount} {pageCount === 1 ? 'page' : 'pages'}
          </div>
        )}
      </div>

      <button
        className={styles.removeBtn}
        onClick={() => onRemove(pdfFile.id)}
        title="Remove file"
        aria-label={`Remove ${pdfFile.file.name}`}
      >
        <X size={16} />
      </button>
    </div>
  );
};
