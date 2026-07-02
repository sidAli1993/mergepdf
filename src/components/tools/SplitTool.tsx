'use client';

import React, { useRef, useState } from 'react';
import {
  Scissors, FileText, Upload, Plus, X, Download,
  CheckCircle2, AlertCircle, Zap, BookOpen, Layers
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { downloadPdf, renderAllThumbnails, parsePageRanges } from '@/components/pdf/pdfUtils';
import s from './ToolShell.module.css';
import ss from './SplitTool.module.css';

type SplitMode = 'ranges' | 'every' | 'visual';

interface Range { id: string; label: string; pages: string; color: string; }

const COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

const makeRange = (idx: number, pages = ''): Range => ({
  id: Math.random().toString(36).slice(2),
  label: `Part ${idx + 1}`,
  pages,
  color: COLORS[idx % COLORS.length],
});

export const SplitTool: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [mode, setMode] = useState<SplitMode>('ranges');
  const [ranges, setRanges] = useState<Range[]>([makeRange(0, ''), makeRange(1, '')]);
  const [everyN, setEveryN] = useState('1');
  // Visual mode: splitPoints is a set of page-gap indices (after page i)
  const [splitPoints, setSplitPoints] = useState<Set<number>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [downloadCount, setDownloadCount] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const loadFile = async (f: File) => {
    setFile(f); setDone(false); setError(null); setSplitPoints(new Set());
    setThumbnails([]); setLoadingThumbs(false);
    try {
      const buf = await f.arrayBuffer();
      const doc = await PDFDocument.load(buf);
      setPageCount(doc.getPageCount());
      setRanges([makeRange(0, ''), makeRange(1, '')]);
    } catch { setPageCount(0); }
  };

  const loadThumbnailsForVisual = async () => {
    if (!file || thumbnails.length > 0) return;
    setLoadingThumbs(true);
    try {
      const thumbs = await renderAllThumbnails(file, 0.22);
      setThumbnails(thumbs);
    } finally { setLoadingThumbs(false); }
  };

  const handleModeChange = (m: SplitMode) => {
    setMode(m);
    setDone(false);
    if (m === 'visual') loadThumbnailsForVisual();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type === 'application/pdf' || f.name.endsWith('.pdf'))) loadFile(f);
  };

  /* ── Ranges mode ──────────────────────────────── */
  const addRange = () => setRanges(prev => [...prev, makeRange(prev.length)]);
  const removeRange = (id: string) => setRanges(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
  const updateRange = (id: string, field: 'label' | 'pages', val: string) =>
    setRanges(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));

  /* ── Visual mode helpers ──────────────────────── */
  const toggleSplitPoint = (after: number) =>
    setSplitPoints(prev => {
      const next = new Set(prev);
      if (next.has(after)) next.delete(after); else next.add(after);
      return next;
    });

  const getVisualParts = (): number[][] => {
    const points = Array.from(splitPoints).sort((a, b) => a - b);
    const parts: number[][] = [];
    let start = 0;
    for (const p of points) {
      parts.push(Array.from({ length: p - start + 1 }, (_, i) => start + i));
      start = p + 1;
    }
    parts.push(Array.from({ length: pageCount - start }, (_, i) => start + i));
    return parts.filter(p => p.length > 0);
  };

  /* ── Quick presets ────────────────────────────── */
  const applyPreset = (preset: 'half' | 'thirds' | 'odd-even' | 'individual') => {
    setMode('ranges');
    if (preset === 'half') {
      const mid = Math.floor(pageCount / 2);
      setRanges([
        { ...makeRange(0), pages: `1-${mid}`, label: 'First Half' },
        { ...makeRange(1), pages: `${mid + 1}-${pageCount}`, label: 'Second Half' },
      ]);
    } else if (preset === 'thirds') {
      const t1 = Math.floor(pageCount / 3);
      const t2 = Math.floor((pageCount * 2) / 3);
      setRanges([
        { ...makeRange(0), pages: `1-${t1}`, label: 'Part 1' },
        { ...makeRange(1), pages: `${t1 + 1}-${t2}`, label: 'Part 2' },
        { ...makeRange(2), pages: `${t2 + 1}-${pageCount}`, label: 'Part 3' },
      ]);
    } else if (preset === 'odd-even') {
      setRanges([
        { ...makeRange(0), pages: Array.from({ length: pageCount }, (_, i) => i + 1).filter(n => n % 2 !== 0).join(', '), label: 'Odd Pages' },
        { ...makeRange(1), pages: Array.from({ length: pageCount }, (_, i) => i + 1).filter(n => n % 2 === 0).join(', '), label: 'Even Pages' },
      ]);
    } else {
      setRanges(Array.from({ length: pageCount }, (_, i) => ({ ...makeRange(i), pages: `${i + 1}`, label: `Page ${i + 1}` })));
    }
  };

  /* ── Process ──────────────────────────────────── */
  const handleSplit = async () => {
    if (!file || !pageCount) return;
    setProcessing(true); setError(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer);
      const baseName = file.name.replace(/\.pdf$/i, '');
      let count = 0;

      const downloadPart = async (indices: number[], label: string) => {
        if (indices.length === 0) return;
        const newDoc = await PDFDocument.create();
        const copied = await newDoc.copyPages(srcDoc, indices);
        copied.forEach(p => newDoc.addPage(p));
        const bytes = await newDoc.save();
        downloadPdf(bytes, `${baseName}-${label}.pdf`);
        count++;
        await new Promise(r => setTimeout(r, 350));
      };

      if (mode === 'ranges') {
        for (const range of ranges) {
          const indices = parsePageRanges(range.pages, pageCount);
          await downloadPart(indices, range.label.replace(/\s+/g, '-').toLowerCase() || `part-${count + 1}`);
        }
      } else if (mode === 'every') {
        const n = Math.max(1, parseInt(everyN, 10) || 1);
        for (let start = 0; start < pageCount; start += n) {
          const indices = Array.from({ length: Math.min(n, pageCount - start) }, (_, i) => start + i);
          await downloadPart(indices, `part-${count + 1}`);
        }
      } else {
        // visual
        const parts = getVisualParts();
        for (let i = 0; i < parts.length; i++) {
          await downloadPart(parts[i], `part-${i + 1}`);
        }
      }

      setDownloadCount(count);
      setDone(true);
    } catch { setError('Failed to split PDF. Ensure the file is a valid PDF.'); }
    finally { setProcessing(false); }
  };

  const reset = () => {
    setFile(null); setPageCount(0); setDone(false); setError(null);
    setThumbnails([]); setSplitPoints(new Set());
    setRanges([makeRange(0, ''), makeRange(1, '')]);
  };

  const partsCount = mode === 'every'
    ? Math.ceil(pageCount / Math.max(1, parseInt(everyN) || 1))
    : mode === 'visual'
      ? getVisualParts().length
      : ranges.length;

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
        <p className={s.uploadSub}>Click to browse · Multiple split modes available</p>
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
        <span className={s.fileBarMeta}>{pageCount} pages · {partsCount} part{partsCount !== 1 ? 's' : ''}</span>
        <button className={s.fileBarChange} onClick={reset}>Change</button>
      </div>

      {/* Mode tabs */}
      <div className={ss.modeTabs}>
        {(['ranges', 'every', 'visual'] as SplitMode[]).map(m => (
          <button
            key={m}
            className={`${ss.modeTab} ${mode === m ? ss.modeTabActive : ''}`}
            onClick={() => handleModeChange(m)}
          >
            {m === 'ranges' && <><BookOpen size={14} />Custom Ranges</>}
            {m === 'every' && <><Scissors size={14} />Every N Pages</>}
            {m === 'visual' && <><Layers size={14} />Visual Splitter</>}
          </button>
        ))}
      </div>

      {/* Quick presets (only in ranges mode) */}
      {mode === 'ranges' && pageCount > 0 && (
        <div className={ss.presets}>
          <span className={ss.presetsLabel}>Quick presets:</span>
          <button className={ss.presetBtn} onClick={() => applyPreset('half')}><Zap size={11} />Split in half</button>
          <button className={ss.presetBtn} onClick={() => applyPreset('thirds')}><Zap size={11} />Split in thirds</button>
          <button className={ss.presetBtn} onClick={() => applyPreset('odd-even')}><Zap size={11} />Odd / Even</button>
          {pageCount <= 20 && <button className={ss.presetBtn} onClick={() => applyPreset('individual')}><Zap size={11} />Every page</button>}
        </div>
      )}

      {/* ── Ranges mode ── */}
      {mode === 'ranges' && (
        <div className={ss.rangeList}>
          {ranges.map((range, idx) => (
            <div className={ss.rangeRow} key={range.id}>
              <div className={ss.rangeColorDot} style={{ background: range.color }} />
              <input
                className={ss.rangeLabelInput}
                value={range.label}
                onChange={e => updateRange(range.id, 'label', e.target.value)}
                placeholder="Label"
              />
              <input
                className={ss.rangePagesInput}
                placeholder={`e.g. ${idx + 1}-${Math.min(idx + 3, pageCount)}`}
                value={range.pages}
                onChange={e => updateRange(range.id, 'pages', e.target.value)}
              />
              <span className={ss.rangePagesHint}>
                {parsePageRanges(range.pages, pageCount).length > 0
                  ? `${parsePageRanges(range.pages, pageCount).length} pages`
                  : 'pages e.g. 1-5'}
              </span>
              <button className={ss.rangeRemoveBtn} onClick={() => removeRange(range.id)} title="Remove">
                <X size={13} />
              </button>
            </div>
          ))}
          <button className={ss.addRangeBtn} onClick={addRange}><Plus size={14} />Add Range</button>
        </div>
      )}

      {/* ── Every N mode ── */}
      {mode === 'every' && (
        <div className={ss.everyWrap}>
          <div className={ss.everyRow}>
            <span className={ss.everyLabel}>Split every</span>
            <input
              className={ss.everyInput}
              type="number" min={1} max={pageCount}
              value={everyN}
              onChange={e => setEveryN(e.target.value)}
            />
            <span className={ss.everyLabel}>pages</span>
          </div>
          <div className={ss.everyPreview}>
            <div className={ss.everyPreviewItem}>
              <span className={ss.everyPreviewNum}>{partsCount}</span>
              <span className={ss.everyPreviewLabel}>output files</span>
            </div>
            <div className={ss.everyPreviewItem}>
              <span className={ss.everyPreviewNum}>{Math.max(1, parseInt(everyN) || 1)}</span>
              <span className={ss.everyPreviewLabel}>pages each</span>
            </div>
            <div className={ss.everyPreviewItem}>
              <span className={ss.everyPreviewNum}>{pageCount % Math.max(1, parseInt(everyN) || 1) || Math.max(1, parseInt(everyN) || 1)}</span>
              <span className={ss.everyPreviewLabel}>last file pages</span>
            </div>
          </div>
          {/* Visual breakdown bar */}
          <div className={ss.breakdownBar}>
            {Array.from({ length: partsCount }, (_, i) => (
              <div key={i} className={ss.breakdownChunk} style={{ background: COLORS[i % COLORS.length], flex: 1 }}>
                {partsCount <= 10 && <span>{i + 1}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Visual splitter mode ── */}
      {mode === 'visual' && (
        <div className={ss.visualWrap}>
          {loadingThumbs ? (
            <div className={s.loadingRow}><div className={s.spinner} />Loading page previews…</div>
          ) : (
            <>
              <p className={ss.visualHint}>Click the <strong>gap between pages</strong> to add a split point. Each coloured group becomes a separate PDF.</p>
              <div className={ss.visualStrip}>
                {Array.from({ length: pageCount }, (_, i) => {
                  const parts = getVisualParts();
                  const partIndex = parts.findIndex(p => p.includes(i));
                  return (
                    <React.Fragment key={i}>
                      <div className={ss.visualPage} style={{ borderColor: COLORS[partIndex % COLORS.length] }}>
                        {thumbnails[i]
                          ? <img src={thumbnails[i]} alt={`p${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span className={ss.visualPageNum}>{i + 1}</span>
                        }
                        <span className={ss.visualPageLabel}>{i + 1}</span>
                      </div>
                      {i < pageCount - 1 && (
                        <button
                          className={`${ss.splitMarker} ${splitPoints.has(i) ? ss.splitMarkerActive : ''}`}
                          onClick={() => toggleSplitPoint(i)}
                          title={splitPoints.has(i) ? 'Remove split here' : 'Split here'}
                        >
                          {splitPoints.has(i) ? <Scissors size={10} /> : '+'}
                        </button>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              {splitPoints.size > 0 && (
                <div className={ss.visualSummary}>
                  {getVisualParts().map((part, i) => (
                    <div className={ss.visualSummaryChip} key={i} style={{ borderColor: COLORS[i % COLORS.length], background: `${COLORS[i % COLORS.length]}18` }}>
                      <span style={{ color: COLORS[i % COLORS.length], fontWeight: 700 }}>Part {i + 1}</span>
                      <span>pp. {part.map(p => p + 1).join(', ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {error && <div className={s.error}><AlertCircle size={14} />{error}</div>}

      {done ? (
        <div className={s.successCard}>
          <CheckCircle2 className={s.successIcon} size={40} />
          <h3 className={s.successTitle}>Split Complete!</h3>
          <p className={s.successDesc}>{downloadCount} PDF{downloadCount !== 1 ? 's' : ''} downloaded to your device.</p>
          <button className={s.downloadBtn} onClick={reset}><Upload size={16} />Split another PDF</button>
        </div>
      ) : (
        <div className={s.actionBar} style={{ marginTop: 16 }}>
          <button
            className={`${s.primaryBtn} ${processing ? s.loading : ''}`}
            onClick={handleSplit}
            disabled={processing}
            id="split-button"
          >
            <Scissors size={18} />
            {processing ? 'Splitting…' : `Split into ${partsCount} PDF${partsCount !== 1 ? 's' : ''}`}
          </button>
          <button className={s.secondaryBtn} onClick={reset}><Upload size={14} />Choose different file</button>
        </div>
      )}
    </div>
  );
};
