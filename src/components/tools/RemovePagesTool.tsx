'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Eraser, FileText, Upload, X, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { downloadPdf, renderAllThumbnails } from '@/components/pdf/pdfUtils';
import s from './ToolShell.module.css';

export const RemovePagesTool: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loadingProgress, setLoadingProgress] = useState<{ done: number; total: number } | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set()); // 0-based page indices to remove
  const [processing, setProcessing] = useState(false);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const loadFile = useCallback(async (f: File) => {
    setFile(f);
    setThumbnails([]);
    setSelected(new Set());
    setResultBytes(null);
    setError(null);
    setLoadingProgress({ done: 0, total: 0 });

    try {
      const thumbs = await renderAllThumbnails(f, 0.28, (done, total) => {
        setLoadingProgress({ done, total });
      });
      setThumbnails(thumbs);
    } catch {
      setError('Could not render page thumbnails. The file may be corrupted.');
    } finally {
      setLoadingProgress(null);
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type === 'application/pdf' || f.name.endsWith('.pdf'))) loadFile(f);
  };

  const togglePage = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
    setResultBytes(null);
  };

  const selectAll = () => {
    setSelected(new Set(thumbnails.map((_, i) => i)));
    setResultBytes(null);
  };

  const clearAll = () => { setSelected(new Set()); setResultBytes(null); };

  const handleRemove = async () => {
    if (!file || selected.size === 0 || selected.size === thumbnails.length) {
      setError(
        selected.size === thumbnails.length
          ? 'You cannot remove all pages from a PDF.'
          : 'Select at least one page to remove.'
      );
      return;
    }
    setProcessing(true); setError(null);
    try {
      const buf = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(buf);
      const keepIndices = srcDoc.getPageIndices().filter((i) => !selected.has(i));
      const newDoc = await PDFDocument.create();
      const pages = await newDoc.copyPages(srcDoc, keepIndices);
      pages.forEach((p) => newDoc.addPage(p));
      setResultBytes(await newDoc.save());
    } catch {
      setError('Failed to process PDF. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null); setThumbnails([]); setSelected(new Set());
    setResultBytes(null); setError(null); setLoadingProgress(null);
  };

  const baseName = file?.name.replace(/\.pdf$/i, '') ?? 'document';

  if (!file) {
    return (
      <div
        className={`${s.uploadZone} ${dragging ? s.dragOver : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className={s.uploadIcon}><Eraser size={26} /></div>
        <p className={s.uploadTitle}>Drop a PDF to remove pages</p>
        <p className={s.uploadSub}>Click to browse · PDF only</p>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = ''; }} />
      </div>
    );
  }

  return (
    <div className={s.shell}>
      {/* File bar */}
      <div className={s.fileBar}>
        <div className={s.fileBarIcon}><FileText size={18} /></div>
        <span className={s.fileBarName}>{file.name}</span>
        <span className={s.fileBarMeta}>{thumbnails.length || '?'} pages</span>
        <button className={s.fileBarChange} onClick={reset}>Change</button>
      </div>

      {/* Loading */}
      {loadingProgress !== null && (
        <div className={s.loadingRow}>
          <div className={s.spinner} />
          Rendering pages{loadingProgress.total > 0 ? ` ${loadingProgress.done}/${loadingProgress.total}` : ''}…
        </div>
      )}

      {/* Page grid */}
      {thumbnails.length > 0 && (
        <>
          <div className={s.selectBar}>
            <button className={s.selectBarBtn} onClick={selectAll}>Select All</button>
            <button className={s.selectBarBtn} onClick={clearAll}>Clear</button>
            <span className={s.selectBarCount}>
              {selected.size > 0 ? `${selected.size} page${selected.size !== 1 ? 's' : ''} marked for removal` : 'Click pages to select'}
            </span>
          </div>

          <div className={s.pageGrid}>
            {thumbnails.map((thumb, i) => (
              <div key={i} className={s.pageTile} onClick={() => togglePage(i)}>
                <div className={`${s.pageTileThumb} ${selected.has(i) ? s.selected : ''}`}>
                  <img src={thumb} alt={`Page ${i + 1}`} />
                  <div className={s.pageTileOverlay}>
                    {selected.has(i) && <div className={s.pageTileBadge}><X size={10} /></div>}
                  </div>
                </div>
                <span className={s.pageTileLabel}>p.{i + 1}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {error && <div className={s.error}><AlertCircle size={14} />{error}</div>}

      {resultBytes ? (
        <div className={s.successCard}>
          <CheckCircle2 className={s.successIcon} size={40} />
          <h3 className={s.successTitle}>Pages Removed!</h3>
          <p className={s.successDesc}>
            {selected.size} page{selected.size !== 1 ? 's' : ''} removed. {thumbnails.length - selected.size} page{thumbnails.length - selected.size !== 1 ? 's' : ''} remain.
          </p>
          <button className={s.downloadBtn} onClick={() => downloadPdf(resultBytes, `${baseName}-edited.pdf`)}>
            <Download size={16} />Download PDF
          </button>
          <button className={s.resetLink} onClick={reset}>Process another file</button>
        </div>
      ) : (
        thumbnails.length > 0 && (
          <div className={s.actionBar}>
            <button
              className={`${s.primaryBtn} ${processing ? s.loading : ''}`}
              onClick={handleRemove}
              disabled={processing || selected.size === 0}
              id="remove-pages-button"
            >
              <Eraser size={18} />
              {processing ? 'Removing pages...' : selected.size > 0 ? `Remove ${selected.size} Page${selected.size !== 1 ? 's' : ''}` : 'Select pages to remove'}
            </button>
            <button className={s.secondaryBtn} onClick={reset}>
              <Upload size={14} />Choose different file
            </button>
          </div>
        )
      )}
    </div>
  );
};
