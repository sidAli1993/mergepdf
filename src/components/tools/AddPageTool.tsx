'use client';

import React, { useRef, useState } from 'react';
import { FilePlus, FileText, Upload, Download, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { PDFDocument, PageSizes } from 'pdf-lib';
import { downloadPdf } from '@/components/pdf/pdfUtils';
import s from './ToolShell.module.css';

type InsertMode = 'blank' | 'pdf';

export const AddPageTool: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const insertRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState<InsertMode>('blank');
  const [insertFile, setInsertFile] = useState<File | null>(null);
  const [insertPageCount, setInsertPageCount] = useState(0);
  const [position, setPosition] = useState('');
  const [processing, setProcessing] = useState(false);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const loadFile = async (f: File) => {
    setFile(f); setResultBytes(null); setError(null);
    try {
      const buf = await f.arrayBuffer();
      const doc = await PDFDocument.load(buf);
      setPageCount(doc.getPageCount());
      setPosition(String(doc.getPageCount() + 1)); // default: end
    } catch {
      setPageCount(0);
    }
  };

  const loadInsertFile = async (f: File) => {
    setInsertFile(f); setResultBytes(null);
    try {
      const buf = await f.arrayBuffer();
      const doc = await PDFDocument.load(buf);
      setInsertPageCount(doc.getPageCount());
    } catch {
      setInsertPageCount(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type === 'application/pdf' || f.name.endsWith('.pdf'))) loadFile(f);
  };

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true); setError(null);

    try {
      const buf = await file.arrayBuffer();
      const doc = await PDFDocument.load(buf);
      const pos = Math.min(Math.max(1, parseInt(position, 10) || pageCount + 1), pageCount + 1);
      const insertAt = pos - 1; // 0-based

      if (mode === 'blank') {
        // Get size from first page or default to A4
        const refPage = doc.getPage(0);
        const { width, height } = refPage.getSize();
        const newPage = doc.insertPage(insertAt, [width, height]);
        void newPage; // page is already inserted
      } else {
        if (!insertFile) { setError('Please select a PDF to insert.'); setProcessing(false); return; }
        const insertBuf = await insertFile.arrayBuffer();
        const insertDoc = await PDFDocument.load(insertBuf);
        const indices = insertDoc.getPageIndices();
        const copiedPages = await doc.copyPages(insertDoc, indices);
        // Insert pages in reverse order at the same position to maintain order
        copiedPages.reverse().forEach((p) => doc.insertPage(insertAt, p));
      }

      setResultBytes(await doc.save());
    } catch {
      setError('Failed to add page(s). Please ensure all files are valid PDFs.');
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null); setPageCount(0); setInsertFile(null);
    setInsertPageCount(0); setResultBytes(null); setError(null); setPosition('');
  };

  const baseName = file?.name.replace(/\.pdf$/i, '') ?? 'document';

  const newPageCount = mode === 'blank'
    ? pageCount + 1
    : pageCount + insertPageCount;

  if (!file) {
    return (
      <div
        className={`${s.uploadZone} ${dragging ? s.dragOver : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className={s.uploadIcon}><FilePlus size={26} /></div>
        <p className={s.uploadTitle}>Drop a PDF to add pages</p>
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
        <span className={s.fileBarMeta}>{pageCount} pages</span>
        <button className={s.fileBarChange} onClick={reset}>Change</button>
      </div>

      {/* Mode */}
      <div className={s.toggleGroup}>
        <button className={`${s.toggleBtn} ${mode === 'blank' ? s.active : ''}`} onClick={() => { setMode('blank'); setResultBytes(null); }}>
          Insert Blank Page
        </button>
        <button className={`${s.toggleBtn} ${mode === 'pdf' ? s.active : ''}`} onClick={() => { setMode('pdf'); setResultBytes(null); }}>
          Insert PDF Pages
        </button>
      </div>

      {/* Position */}
      <div className={s.posRow}>
        <span className={s.posLabel}>Insert at position</span>
        <input
          className={s.posInput}
          type="number"
          min={1}
          max={pageCount + 1}
          value={position}
          onChange={(e) => { setPosition(e.target.value); setResultBytes(null); }}
        />
        <span className={s.posHint}>
          (1 = before first · {pageCount + 1} = after last)
        </span>
      </div>

      {/* Insert PDF picker */}
      {mode === 'pdf' && (
        <>
          <p className={s.sectionHead}>PDF to insert</p>
          {insertFile ? (
            <div className={s.fileBar} style={{ marginBottom: 16 }}>
              <div className={s.fileBarIcon}><FileText size={18} /></div>
              <span className={s.fileBarName}>{insertFile.name}</span>
              <span className={s.fileBarMeta}>{insertPageCount} pages</span>
              <button className={s.fileBarChange} onClick={() => insertRef.current?.click()}>Change</button>
            </div>
          ) : (
            <button
              className={s.secondaryBtn}
              style={{ marginBottom: 16 }}
              onClick={() => insertRef.current?.click()}
            >
              <FilePlus size={16} />Select PDF to insert
            </button>
          )}
          <input ref={insertRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) loadInsertFile(f); e.target.value = ''; }} />
        </>
      )}

      {/* Preview info */}
      {(mode === 'blank' || insertFile) && (
        <div className={s.infoBox}>
          <Info size={14} />
          <span>
            Result will have <strong>{newPageCount}</strong> page{newPageCount !== 1 ? 's' : ''}.
          </span>
        </div>
      )}

      {error && <div className={s.error}><AlertCircle size={14} />{error}</div>}

      {resultBytes ? (
        <div className={s.successCard}>
          <CheckCircle2 className={s.successIcon} size={40} />
          <h3 className={s.successTitle}>Page{mode === 'pdf' ? 's' : ''} Added!</h3>
          <p className={s.successDesc}>Your PDF now has {newPageCount} pages.</p>
          <button className={s.downloadBtn} onClick={() => downloadPdf(resultBytes, `${baseName}-with-page.pdf`)}>
            <Download size={16} />Download PDF
          </button>
          <button className={s.resetLink} onClick={reset}>Process another file</button>
        </div>
      ) : (
        <div className={s.actionBar}>
          <button
            className={`${s.primaryBtn} ${processing ? s.loading : ''}`}
            onClick={handleProcess}
            disabled={processing || (mode === 'pdf' && !insertFile)}
            id="add-page-button"
          >
            <FilePlus size={18} />
            {processing ? 'Processing...' : mode === 'blank' ? 'Add Blank Page' : 'Insert PDF Pages'}
          </button>
          <button className={s.secondaryBtn} onClick={reset}>
            <Upload size={14} />Choose different file
          </button>
        </div>
      )}
    </div>
  );
};
