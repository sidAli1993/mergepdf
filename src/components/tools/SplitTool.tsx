'use client';

import React, { useRef, useState } from 'react';
import { Scissors, FileText, Upload, Plus, X, Download, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { downloadPdf, parsePageRanges } from '@/components/pdf/pdfUtils';
import s from './ToolShell.module.css';

type SplitMode = 'ranges' | 'every';

interface RangeEntry {
  id: string;
  value: string;
}

export const SplitTool: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState<SplitMode>('ranges');
  const [ranges, setRanges] = useState<RangeEntry[]>([{ id: 'r1', value: '' }]);
  const [everyN, setEveryN] = useState('1');
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [downloadCount, setDownloadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const loadFile = async (f: File) => {
    setFile(f); setDone(false); setError(null);
    try {
      const { PDFDocument: PD } = await import('pdf-lib');
      const buf = await f.arrayBuffer();
      const doc = await PD.load(buf);
      setPageCount(doc.getPageCount());
    } catch {
      setPageCount(0);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) loadFile(f);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type === 'application/pdf' || f.name.endsWith('.pdf'))) loadFile(f);
  };

  const addRange = () =>
    setRanges((prev) => [...prev, { id: Math.random().toString(36).slice(2), value: '' }]);

  const removeRange = (id: string) =>
    setRanges((prev) => prev.length > 1 ? prev.filter((r) => r.id !== id) : prev);

  const updateRange = (id: string, value: string) =>
    setRanges((prev) => prev.map((r) => r.id === id ? { ...r, value } : r));

  const handleSplit = async () => {
    if (!file || !pageCount) return;
    setProcessing(true); setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer);
      const baseName = file.name.replace(/\.pdf$/i, '');
      let count = 0;

      if (mode === 'ranges') {
        for (const range of ranges) {
          const indices = parsePageRanges(range.value, pageCount);
          if (indices.length === 0) continue;
          const newDoc = await PDFDocument.create();
          const copied = await newDoc.copyPages(srcDoc, indices);
          copied.forEach((p) => newDoc.addPage(p));
          const bytes = await newDoc.save();
          const label = range.value.trim().replace(/\s+/g, '') || `part${count + 1}`;
          downloadPdf(bytes, `${baseName}-pages-${label}.pdf`);
          count++;
          await new Promise((r) => setTimeout(r, 300)); // stagger downloads
        }
      } else {
        const n = Math.max(1, parseInt(everyN, 10) || 1);
        let partNum = 1;
        for (let start = 0; start < pageCount; start += n) {
          const indices = Array.from({ length: Math.min(n, pageCount - start) }, (_, i) => start + i);
          const newDoc = await PDFDocument.create();
          const copied = await newDoc.copyPages(srcDoc, indices);
          copied.forEach((p) => newDoc.addPage(p));
          const bytes = await newDoc.save();
          downloadPdf(bytes, `${baseName}-part-${partNum}.pdf`);
          partNum++; count++;
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      setDownloadCount(count);
      setDone(true);
    } catch {
      setError('Failed to split PDF. Please ensure the file is a valid PDF.');
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null); setPageCount(0); setDone(false); setError(null);
    setRanges([{ id: 'r1', value: '' }]);
  };

  if (!file) {
    return (
      <div
        className={`${s.uploadZone} ${dragging ? s.dragOver : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className={s.uploadIcon}><Scissors size={26} /></div>
        <p className={s.uploadTitle}>Drop a PDF here to split</p>
        <p className={s.uploadSub}>Click to browse · PDF only</p>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={handleInputChange} />
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

      {/* Info */}
      <div className={s.infoBox}>
        <Info size={14} />
        <span>Each split part will download as a separate PDF file.</span>
      </div>

      {/* Mode toggle */}
      <div className={s.toggleGroup}>
        <button className={`${s.toggleBtn} ${mode === 'ranges' ? s.active : ''}`} onClick={() => setMode('ranges')}>
          By Page Ranges
        </button>
        <button className={`${s.toggleBtn} ${mode === 'every' ? s.active : ''}`} onClick={() => setMode('every')}>
          Every N Pages
        </button>
      </div>

      {mode === 'ranges' ? (
        <>
          <p className={s.sectionHead}>Ranges (e.g. 1-3 or 5)</p>
          <div className={s.rangeList}>
            {ranges.map((range) => (
              <div className={s.rangeRow} key={range.id}>
                <input
                  className={s.input}
                  placeholder={`e.g. 1-${Math.min(3, pageCount)}`}
                  value={range.value}
                  onChange={(e) => updateRange(range.id, e.target.value)}
                />
                <button className={s.rangeRemoveBtn} onClick={() => removeRange(range.id)} title="Remove range">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <button className={s.addRangeBtn} onClick={addRange}>
            <Plus size={14} />Add another range
          </button>
        </>
      ) : (
        <div className={s.posRow}>
          <span className={s.posLabel}>Split every</span>
          <input
            className={s.posInput}
            type="number"
            min={1}
            max={pageCount}
            value={everyN}
            onChange={(e) => setEveryN(e.target.value)}
          />
          <span className={s.posHint}>
            pages → {Math.ceil(pageCount / Math.max(1, parseInt(everyN) || 1))} parts
          </span>
        </div>
      )}

      {error && <div className={s.error}><AlertCircle size={14} />{error}</div>}

      {done ? (
        <div className={s.successCard}>
          <CheckCircle2 className={s.successIcon} size={40} />
          <h3 className={s.successTitle}>Split Complete!</h3>
          <p className={s.successDesc}>{downloadCount} PDF{downloadCount !== 1 ? 's' : ''} downloaded to your device.</p>
          <button className={s.downloadBtn} onClick={reset}>
            <Upload size={16} />Split another PDF
          </button>
        </div>
      ) : (
        <div className={s.actionBar}>
          <button
            className={`${s.primaryBtn} ${processing ? s.loading : ''}`}
            onClick={handleSplit}
            disabled={processing}
            id="split-button"
          >
            <Scissors size={18} />
            {processing ? 'Splitting...' : 'Split PDF'}
          </button>
          <button className={s.secondaryBtn} onClick={reset}>
            <Upload size={14} />Choose different file
          </button>
        </div>
      )}
    </div>
  );
};
