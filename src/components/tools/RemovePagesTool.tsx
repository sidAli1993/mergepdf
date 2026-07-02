'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Eraser, FileText, Upload, Download, CheckCircle2, AlertCircle,
  ZoomIn, ZoomOut, Layers, RotateCcw, MousePointer, Hash
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { downloadPdf, renderAllThumbnails } from '@/components/pdf/pdfUtils';
import s from './ToolShell.module.css';
import rs from './RemovePagesTool.module.css';

type SelectionMode = 'remove' | 'keep';
type ZoomLevel = 'sm' | 'md' | 'lg';

const ZOOM_COLS: Record<ZoomLevel, string> = {
  sm: 'repeat(auto-fill, minmax(80px, 1fr))',
  md: 'repeat(auto-fill, minmax(120px, 1fr))',
  lg: 'repeat(auto-fill, minmax(180px, 1fr))',
};

export const RemovePagesTool: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loadingProgress, setLoadingProgress] = useState<{ done: number; total: number } | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('remove');
  const [zoom, setZoom] = useState<ZoomLevel>('md');
  const [rangeInput, setRangeInput] = useState('');
  const [lastClicked, setLastClicked] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const total = thumbnails.length;

  const loadFile = useCallback(async (f: File) => {
    setFile(f); setThumbnails([]); setSelected(new Set());
    setResultBytes(null); setError(null); setRangeInput('');
    setLoadingProgress({ done: 0, total: 0 });
    try {
      const thumbs = await renderAllThumbnails(f, 0.3, (done, total) =>
        setLoadingProgress({ done, total })
      );
      setThumbnails(thumbs);
    } catch {
      setError('Could not render thumbnails. Ensure the file is a valid, non-encrypted PDF.');
    } finally { setLoadingProgress(null); }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type === 'application/pdf' || f.name.endsWith('.pdf'))) loadFile(f);
  };

  // Click: single toggle; Shift+click: range; Ctrl/Cmd: additive single
  const handlePageClick = (index: number, e: React.MouseEvent) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (e.shiftKey && lastClicked !== null) {
        const from = Math.min(lastClicked, index);
        const to = Math.max(lastClicked, index);
        for (let i = from; i <= to; i++) next.add(i);
      } else if (e.ctrlKey || e.metaKey) {
        if (next.has(index)) next.delete(index); else next.add(index);
      } else {
        if (next.has(index) && next.size === 1) next.clear();
        else { next.clear(); next.add(index); }
      }
      return next;
    });
    setLastClicked(index);
    setResultBytes(null);
  };

  const selectAll = () => { setSelected(new Set(thumbnails.map((_, i) => i))); setResultBytes(null); };
  const clearAll = () => { setSelected(new Set()); setResultBytes(null); };
  const invertSelection = () => {
    setSelected(prev => new Set(thumbnails.map((_, i) => i).filter(i => !prev.has(i))));
    setResultBytes(null);
  };
  const selectOdd = () => { setSelected(new Set(thumbnails.map((_, i) => i).filter(i => i % 2 === 0))); setResultBytes(null); };
  const selectEven = () => { setSelected(new Set(thumbnails.map((_, i) => i).filter(i => i % 2 !== 0))); setResultBytes(null); };

  // Parse range text like "1-3, 5, 7-9" into 0-based indices
  const applyRange = () => {
    if (!rangeInput.trim()) return;
    const indices = new Set<number>();
    rangeInput.split(',').forEach(part => {
      const [a, b] = part.trim().split('-').map(s => parseInt(s.trim(), 10) - 1);
      if (!isNaN(a)) {
        if (b === undefined || isNaN(b)) { if (a >= 0 && a < total) indices.add(a); }
        else { for (let i = Math.max(0, a); i <= Math.min(total - 1, b); i++) indices.add(i); }
      }
    });
    setSelected(indices);
    setResultBytes(null);
  };

  // Keyboard: Delete/Backspace when a page is focused
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected.size > 0 && thumbnails.length > 0) {
        e.preventDefault();
        // Mark selected (already selected), just trigger process
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected, thumbnails]);

  const pagesToRemove = selectionMode === 'remove' ? selected : new Set(thumbnails.map((_, i) => i).filter(i => !selected.has(i)));
  const pagesAfter = total - pagesToRemove.size;

  const handleProcess = async () => {
    if (!file || pagesToRemove.size === 0) { setError('Select pages to remove first.'); return; }
    if (pagesToRemove.size >= total) { setError('You cannot remove all pages from a PDF.'); return; }
    setProcessing(true); setError(null);
    try {
      const buf = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(buf);
      const keepIndices = srcDoc.getPageIndices().filter(i => !pagesToRemove.has(i));
      const newDoc = await PDFDocument.create();
      const pages = await newDoc.copyPages(srcDoc, keepIndices);
      pages.forEach(p => newDoc.addPage(p));
      setResultBytes(await newDoc.save());
    } catch { setError('Failed to process PDF. Please try again.'); }
    finally { setProcessing(false); }
  };

  const reset = () => {
    setFile(null); setThumbnails([]); setSelected(new Set());
    setResultBytes(null); setError(null); setLoadingProgress(null); setRangeInput('');
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
        <p className={s.uploadSub}>Click to browse · Shift+click for range selection · Ctrl+click to multi-select</p>
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
        <span className={s.fileBarMeta}>{total || '?'} pages</span>
        <button className={s.fileBarChange} onClick={reset}>Change</button>
      </div>

      {/* Loading */}
      {loadingProgress !== null && (
        <div className={s.loadingRow}>
          <div className={s.spinner} />
          <span>Rendering pages{loadingProgress.total > 0 ? ` ${loadingProgress.done}/${loadingProgress.total}` : ''}…</span>
        </div>
      )}

      {thumbnails.length > 0 && (
        <>
          {/* Stats bar */}
          <div className={rs.statsBar}>
            <div className={rs.stat}>
              <span className={rs.statNum}>{total}</span>
              <span className={rs.statLabel}>Total</span>
            </div>
            <div className={rs.statDivider} />
            <div className={rs.stat}>
              <span className={rs.statNum} style={{ color: 'var(--danger)' }}>{pagesToRemove.size}</span>
              <span className={rs.statLabel}>To Remove</span>
            </div>
            <div className={rs.statDivider} />
            <div className={rs.stat}>
              <span className={rs.statNum} style={{ color: 'var(--success)' }}>{pagesAfter}</span>
              <span className={rs.statLabel}>Remaining</span>
            </div>
            <div style={{ flex: 1 }} />
            {/* Mode toggle */}
            <div className={rs.modeToggle}>
              <button
                className={`${rs.modeBtn} ${selectionMode === 'remove' ? rs.modeBtnActive : ''}`}
                onClick={() => setSelectionMode('remove')}
              >Remove selected</button>
              <button
                className={`${rs.modeBtn} ${selectionMode === 'keep' ? rs.modeBtnActive : ''}`}
                onClick={() => setSelectionMode('keep')}
              >Keep only selected</button>
            </div>
          </div>

          {/* Toolbar */}
          <div className={rs.toolbar}>
            <div className={rs.toolbarLeft}>
              <button className={rs.toolBtn} onClick={selectAll}><Layers size={13} />All</button>
              <button className={rs.toolBtn} onClick={clearAll}><MousePointer size={13} />None</button>
              <button className={rs.toolBtn} onClick={invertSelection}><RotateCcw size={13} />Invert</button>
              <button className={rs.toolBtn} onClick={selectOdd}>Odd pages</button>
              <button className={rs.toolBtn} onClick={selectEven}>Even pages</button>
              <div className={rs.rangeWrap}>
                <input
                  className={rs.rangeInput}
                  placeholder="e.g. 1-3, 5, 8-12"
                  value={rangeInput}
                  onChange={e => setRangeInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyRange()}
                />
                <button className={rs.rangeApply} onClick={applyRange}><Hash size={12} />Apply</button>
              </div>
            </div>
            <div className={rs.toolbarRight}>
              <button className={`${rs.zoomBtn} ${zoom === 'sm' ? rs.zoomActive : ''}`} onClick={() => setZoom('sm')}><ZoomOut size={14} /></button>
              <button className={`${rs.zoomBtn} ${zoom === 'md' ? rs.zoomActive : ''}`} onClick={() => setZoom('md')}>M</button>
              <button className={`${rs.zoomBtn} ${zoom === 'lg' ? rs.zoomActive : ''}`} onClick={() => setZoom('lg')}><ZoomIn size={14} /></button>
            </div>
          </div>

          {/* Page grid */}
          <div className={rs.pageGrid} style={{ gridTemplateColumns: ZOOM_COLS[zoom] }}>
            {thumbnails.map((thumb, i) => {
              const markedForRemoval = pagesToRemove.has(i);
              const isSelected = selected.has(i);
              return (
                <div
                  key={i}
                  className={`${rs.pageTile} ${markedForRemoval ? rs.pageTileRemove : ''} ${isSelected ? rs.pageTileSelected : ''}`}
                  onClick={e => handlePageClick(i, e)}
                  title={`Page ${i + 1}${markedForRemoval ? ' — will be removed' : ''}`}
                >
                  <div className={rs.pageTileThumb}>
                    <img src={thumb} alt={`Page ${i + 1}`} draggable={false} />
                    {markedForRemoval && (
                      <div className={rs.pageTileOverlay}>
                        <div className={rs.removeBadge}>✕</div>
                      </div>
                    )}
                    {isSelected && !markedForRemoval && (
                      <div className={rs.selectedOverlay} />
                    )}
                  </div>
                  <span className={`${rs.pageLabel} ${markedForRemoval ? rs.pageLabelRemove : ''}`}>p.{i + 1}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {error && <div className={s.error}><AlertCircle size={14} />{error}</div>}

      {resultBytes ? (
        <div className={s.successCard}>
          <CheckCircle2 className={s.successIcon} size={40} />
          <h3 className={s.successTitle}>Pages Removed!</h3>
          <p className={s.successDesc}>
            {pagesToRemove.size} page{pagesToRemove.size !== 1 ? 's' : ''} removed · {pagesAfter} page{pagesAfter !== 1 ? 's' : ''} remaining
          </p>
          <button className={s.downloadBtn} onClick={() => downloadPdf(resultBytes, `${baseName}-edited.pdf`)}>
            <Download size={16} />Download PDF ({pagesAfter} pages)
          </button>
          <button className={s.resetLink} onClick={reset}>Process another file</button>
        </div>
      ) : (
        thumbnails.length > 0 && (
          <div className={rs.stickyBar}>
            <div className={rs.stickyInfo}>
              {pagesToRemove.size > 0
                ? <><span className={rs.stickyBold}>{pagesToRemove.size} page{pagesToRemove.size !== 1 ? 's' : ''}</span> will be removed · {pagesAfter} will remain</>
                : <span style={{ color: 'var(--text-muted)' }}>Select pages to remove (click · shift+click for range)</span>
              }
            </div>
            <button
              className={`${rs.stickyBtn} ${processing ? rs.stickyBtnLoading : ''}`}
              onClick={handleProcess}
              disabled={processing || pagesToRemove.size === 0}
              id="remove-pages-button"
            >
              <Eraser size={16} />
              {processing ? 'Processing…' : pagesToRemove.size > 0 ? `Remove ${pagesToRemove.size} Page${pagesToRemove.size !== 1 ? 's' : ''}` : 'Select pages above'}
            </button>
          </div>
        )
      )}
    </div>
  );
};
