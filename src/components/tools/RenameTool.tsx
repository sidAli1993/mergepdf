'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Tag, FileText, Upload, Download, Plus, X, AlertCircle } from 'lucide-react';
import { downloadPdf } from '@/components/pdf/pdfUtils';
import s from './ToolShell.module.css';

interface RenameEntry {
  id: string;
  file: File;
  name: string; // without extension
  thumbnail?: string;
  pageCount?: number;
}

let idCounter = 0;
const nextId = () => `rename-${++idCounter}`;

const RenameRow: React.FC<{
  entry: RenameEntry;
  onChange: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}> = ({ entry, onChange, onRemove }) => {
  const [thumbnail, setThumbnail] = useState<string | undefined>(entry.thumbnail);
  const [pageCount, setPageCount] = useState<number | undefined>(entry.pageCount);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
        const buf = await entry.file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: buf }).promise;
        if (cancelled) return;
        setPageCount(pdf.numPages);
        const page = await pdf.getPage(1);
        if (cancelled) return;
        const vp = page.getViewport({ scale: 0.22 });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width; canvas.height = vp.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, canvas, viewport: vp }).promise;
        if (!cancelled) setThumbnail(canvas.toDataURL());
      } catch { /* silently fail */ }
    })();
    return () => { cancelled = true; };
  }, [entry.file]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const buf = await entry.file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      downloadPdf(bytes, `${entry.name}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={s.renameRow}>
      <div className={s.renameRowThumb}>
        {thumbnail ? <img src={thumbnail} alt="page 1" /> : <FileText size={16} />}
      </div>
      <input
        className={s.renameRowInput}
        value={entry.name}
        onChange={(e) => onChange(entry.id, e.target.value)}
        placeholder="Enter new filename"
      />
      <span className={s.renameExt}>.pdf</span>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        {pageCount ? `${pageCount}p` : ''} · {formatSize(entry.file.size)}
      </span>
      <button className={s.renameDownBtn} onClick={handleDownload} disabled={downloading} title="Download with new name">
        <Download size={12} />{downloading ? '…' : 'Save'}
      </button>
      <button
        style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
        onClick={() => onRemove(entry.id)}
        title="Remove"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export const RenameTool: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<RenameEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = (files: File[]) => {
    const pdfs = files.filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (!pdfs.length) { setError('Only PDF files are supported.'); return; }
    setError(null);
    setEntries((prev) => [
      ...prev,
      ...pdfs.map((f) => ({
        id: nextId(),
        file: f,
        name: f.name.replace(/\.pdf$/i, ''),
      })),
    ]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleChange = (id: string, name: string) =>
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, name } : e));

  const handleRemove = (id: string) =>
    setEntries((prev) => prev.filter((e) => e.id !== id));

  const handleDownloadAll = async () => {
    for (const entry of entries) {
      const buf = await entry.file.arrayBuffer();
      downloadPdf(new Uint8Array(buf), `${entry.name || entry.file.name}.pdf`);
      await new Promise((r) => setTimeout(r, 300));
    }
  };

  const reset = () => { setEntries([]); setError(null); };

  return (
    <div className={s.shell}>
      {/* Drop zone / add more */}
      <div
        className={`${s.uploadZone} ${dragging ? s.dragOver : ''}`}
        style={entries.length > 0 ? { padding: '20px 24px', marginBottom: 16 } : {}}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        {entries.length > 0 ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <Plus size={16} />Add more PDFs to rename
          </span>
        ) : (
          <>
            <div className={s.uploadIcon}><Tag size={26} /></div>
            <p className={s.uploadTitle}>Drop PDFs here to rename</p>
            <p className={s.uploadSub}>Click to browse · Multiple files supported</p>
          </>
        )}
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple style={{ display: 'none' }}
          onChange={(e) => { addFiles(Array.from(e.target.files || [])); e.target.value = ''; }} />
      </div>

      {error && <div className={s.error}><AlertCircle size={14} />{error}</div>}

      {entries.length > 0 && (
        <>
          <p className={s.sectionHead}>Edit filenames (without .pdf)</p>
          <div className={s.renameList}>
            {entries.map((entry) => (
              <RenameRow key={entry.id} entry={entry} onChange={handleChange} onRemove={handleRemove} />
            ))}
          </div>

          <div className={s.actionBar}>
            <button
              className={s.primaryBtn}
              onClick={handleDownloadAll}
              id="rename-download-all-button"
            >
              <Download size={18} />
              Download All ({entries.length}) with New Names
            </button>
            <button className={s.secondaryBtn} onClick={reset}>
              <Upload size={14} />Start over
            </button>
          </div>
        </>
      )}
    </div>
  );
};
