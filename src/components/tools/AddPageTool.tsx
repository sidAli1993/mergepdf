'use client';

import React, { useRef, useState } from 'react';
import {
  FilePlus, FileText, Upload, Download, CheckCircle2,
  AlertCircle, Copy, Layers, Plus, ChevronRight
} from 'lucide-react';
import { PDFDocument, PageSizes } from 'pdf-lib';
import { downloadPdf, renderAllThumbnails } from '@/components/pdf/pdfUtils';
import s from './ToolShell.module.css';
import as from './AddPageTool.module.css';

type InsertMode = 'blank' | 'pdf' | 'duplicate';
type PageSize = 'A4' | 'Letter' | 'A3' | 'Legal' | 'match';
type PageOrientation = 'portrait' | 'landscape';

const PAGE_SIZES: Record<PageSize, [number, number] | null> = {
  A4: PageSizes.A4,
  Letter: PageSizes.Letter,
  A3: PageSizes.A3,
  Legal: PageSizes.Legal,
  match: null,
};

export const AddPageTool: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const insertRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loadingThumbs, setLoadingThumbs] = useState(false);

  const [mode, setMode] = useState<InsertMode>('blank');
  const [insertFile, setInsertFile] = useState<File | null>(null);
  const [insertPageCount, setInsertPageCount] = useState(0);
  const [insertPages, setInsertPages] = useState('');

  // For duplicate mode
  const [dupSourcePage, setDupSourcePage] = useState(1);
  const [dupCount, setDupCount] = useState(1);

  // Blank page options
  const [pageSize, setPageSize] = useState<PageSize>('match');
  const [orientation, setOrientation] = useState<PageOrientation>('portrait');
  const [blankCount, setBlankCount] = useState(1);

  // Insert position
  const [insertPosition, setInsertPosition] = useState<'before' | 'after' | 'custom'>('after');
  const [customPos, setCustomPos] = useState('');
  const [selectedGap, setSelectedGap] = useState<number | null>(null); // gap after page index (0-based), null = after last

  const [processing, setProcessing] = useState(false);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const loadFile = async (f: File) => {
    setFile(f); setResultBytes(null); setError(null);
    setThumbnails([]); setSelectedGap(null);
    try {
      const buf = await f.arrayBuffer();
      const doc = await PDFDocument.load(buf);
      setPageCount(doc.getPageCount());
      setCustomPos(String(doc.getPageCount() + 1));
    } catch { setPageCount(0); }
  };

  const loadThumbs = async (f: File) => {
    if (thumbnails.length > 0) return;
    setLoadingThumbs(true);
    try {
      const thumbs = await renderAllThumbnails(f, 0.22);
      setThumbnails(thumbs);
    } finally { setLoadingThumbs(false); }
  };

  const loadInsertFile = async (f: File) => {
    setInsertFile(f); setResultBytes(null);
    try {
      const buf = await f.arrayBuffer();
      const doc = await PDFDocument.load(buf);
      setInsertPageCount(doc.getPageCount());
      setInsertPages(`1-${doc.getPageCount()}`);
    } catch { setInsertPageCount(0); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type === 'application/pdf' || f.name.endsWith('.pdf'))) loadFile(f);
  };

  // Resolve insertion index (0-based, insert BEFORE this index; pageCount = append at end)
  const resolveInsertAt = (): number => {
    if (selectedGap !== null) return selectedGap + 1; // after gap index = before page selectedGap+1
    if (insertPosition === 'before') return 0;
    if (insertPosition === 'after') return pageCount;
    const pos = parseInt(customPos, 10);
    return isNaN(pos) ? pageCount : Math.min(Math.max(0, pos - 1), pageCount);
  };

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true); setError(null);
    try {
      const buf = await file.arrayBuffer();
      const doc = await PDFDocument.load(buf);
      const insertAt = resolveInsertAt();

      if (mode === 'blank') {
        const refPage = doc.getPage(0);
        const refSize = refPage.getSize();
        let w = refSize.width;
        let h = refSize.height;
        if (pageSize !== 'match') {
          [w, h] = PAGE_SIZES[pageSize]!;
          if (orientation === 'landscape') [w, h] = [h, w];
        }
        for (let i = 0; i < blankCount; i++) {
          doc.insertPage(insertAt + i, [w, h]);
        }
      } else if (mode === 'pdf') {
        if (!insertFile) { setError('Please select a PDF to insert.'); setProcessing(false); return; }
        const ibuf = await insertFile.arrayBuffer();
        const iDoc = await PDFDocument.load(ibuf);
        // Parse which pages to insert
        let indices = iDoc.getPageIndices();
        if (insertPages.trim()) {
          indices = insertPages.split(',').flatMap(part => {
            const [a, b] = part.trim().split('-').map(s => parseInt(s.trim(), 10) - 1);
            if (isNaN(a)) return [];
            if (b === undefined || isNaN(b)) return a >= 0 && a < iDoc.getPageCount() ? [a] : [];
            return Array.from({ length: b - a + 1 }, (_, k) => a + k).filter(i => i >= 0 && i < iDoc.getPageCount());
          });
        }
        const copied = await doc.copyPages(iDoc, indices);
        copied.reverse().forEach((p, i) => doc.insertPage(insertAt, p));
      } else {
        // duplicate
        const srcIndex = Math.min(Math.max(0, dupSourcePage - 1), pageCount - 1);
        const [copied] = await doc.copyPages(doc, [srcIndex]);
        for (let i = 0; i < dupCount; i++) {
          const [c] = await doc.copyPages(doc, [srcIndex]);
          doc.insertPage(insertAt + i, c);
        }
        void copied;
      }

      setResultBytes(await doc.save());
    } catch { setError('Failed to process PDF. Ensure all files are valid PDFs.'); }
    finally { setProcessing(false); }
  };

  const reset = () => {
    setFile(null); setPageCount(0); setInsertFile(null); setInsertPageCount(0);
    setResultBytes(null); setError(null); setThumbnails([]); setSelectedGap(null);
  };

  const baseName = file?.name.replace(/\.pdf$/i, '') ?? 'document';
  const insertAt = resolveInsertAt();
  const pagesAdded = mode === 'blank' ? blankCount : mode === 'pdf' ? insertPageCount : dupCount;
  const newTotal = pageCount + pagesAdded;

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
        <p className={s.uploadTitle}>Drop a PDF to add or insert pages</p>
        <p className={s.uploadSub}>Click to browse · Blank pages, PDF insert, or page duplication</p>
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

      {/* Mode tabs */}
      <div className={as.modeTabs}>
        {([['blank', 'Insert Blank Page', FilePlus], ['pdf', 'Insert PDF Pages', Layers], ['duplicate', 'Duplicate a Page', Copy]] as const).map(([m, label, Icon]) => (
          <button
            key={m}
            className={`${as.modeTab} ${mode === m ? as.modeTabActive : ''}`}
            onClick={() => { setMode(m); setResultBytes(null); if (m === 'duplicate' && file) loadThumbs(file); }}
          >
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* ── Blank page options ── */}
      {mode === 'blank' && (
        <div className={as.optionGroup}>
          <div className={as.optionRow}>
            <span className={as.optionLabel}>Quantity</span>
            <div className={as.countRow}>
              <button className={as.countBtn} onClick={() => setBlankCount(c => Math.max(1, c - 1))}>−</button>
              <span className={as.countVal}>{blankCount}</span>
              <button className={as.countBtn} onClick={() => setBlankCount(c => c + 1)}>+</button>
            </div>
          </div>
          <div className={as.optionRow}>
            <span className={as.optionLabel}>Size</span>
            <div className={as.chipGroup}>
              {(['match', 'A4', 'Letter', 'A3', 'Legal'] as PageSize[]).map(ps => (
                <button key={ps} className={`${as.chip} ${pageSize === ps ? as.chipActive : ''}`} onClick={() => setPageSize(ps)}>
                  {ps === 'match' ? 'Match PDF' : ps}
                </button>
              ))}
            </div>
          </div>
          {pageSize !== 'match' && (
            <div className={as.optionRow}>
              <span className={as.optionLabel}>Orientation</span>
              <div className={as.chipGroup}>
                <button className={`${as.chip} ${orientation === 'portrait' ? as.chipActive : ''}`} onClick={() => setOrientation('portrait')}>Portrait</button>
                <button className={`${as.chip} ${orientation === 'landscape' ? as.chipActive : ''}`} onClick={() => setOrientation('landscape')}>Landscape</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Insert PDF options ── */}
      {mode === 'pdf' && (
        <div className={as.optionGroup}>
          {insertFile ? (
            <div className={s.fileBar} style={{ marginBottom: 0 }}>
              <div className={s.fileBarIcon}><FileText size={18} /></div>
              <span className={s.fileBarName}>{insertFile.name}</span>
              <span className={s.fileBarMeta}>{insertPageCount} pages</span>
              <button className={s.fileBarChange} onClick={() => insertRef.current?.click()}>Change</button>
            </div>
          ) : (
            <button className={s.secondaryBtn} onClick={() => insertRef.current?.click()}>
              <FilePlus size={16} />Select PDF to insert
            </button>
          )}
          {insertFile && insertPageCount > 1 && (
            <div className={as.optionRow} style={{ marginTop: 10 }}>
              <span className={as.optionLabel}>Pages from that PDF</span>
              <input
                className={as.textInput}
                placeholder={`e.g. 1-${insertPageCount} (all), 2-4, 6`}
                value={insertPages}
                onChange={e => setInsertPages(e.target.value)}
              />
            </div>
          )}
          <input ref={insertRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) loadInsertFile(f); e.target.value = ''; }} />
        </div>
      )}

      {/* ── Duplicate options ── */}
      {mode === 'duplicate' && (
        <div className={as.optionGroup}>
          <div className={as.optionRow}>
            <span className={as.optionLabel}>Source page</span>
            <div className={as.countRow}>
              <button className={as.countBtn} onClick={() => setDupSourcePage(p => Math.max(1, p - 1))}>−</button>
              <span className={as.countVal}>{dupSourcePage}</span>
              <button className={as.countBtn} onClick={() => setDupSourcePage(p => Math.min(pageCount, p + 1))}>+</button>
            </div>
            {thumbnails[dupSourcePage - 1] && (
              <img src={thumbnails[dupSourcePage - 1]} alt={`p${dupSourcePage}`} className={as.dupThumb} />
            )}
          </div>
          <div className={as.optionRow}>
            <span className={as.optionLabel}>Copies to insert</span>
            <div className={as.countRow}>
              <button className={as.countBtn} onClick={() => setDupCount(c => Math.max(1, c - 1))}>−</button>
              <span className={as.countVal}>{dupCount}</span>
              <button className={as.countBtn} onClick={() => setDupCount(c => c + 1)}>+</button>
            </div>
          </div>
          {loadingThumbs && <div className={s.loadingRow}><div className={s.spinner} />Loading thumbnails…</div>}
        </div>
      )}

      {/* ── Insertion position ── */}
      <div className={as.posSection}>
        <p className={as.posSectionTitle}><ChevronRight size={14} />Where to insert</p>
        <div className={as.posChipGroup}>
          {(['before', 'after', 'custom'] as const).map(p => (
            <button
              key={p}
              className={`${as.chip} ${insertPosition === p && selectedGap === null ? as.chipActive : ''}`}
              onClick={() => { setInsertPosition(p); setSelectedGap(null); setResultBytes(null); }}
            >
              {p === 'before' ? 'Before page 1' : p === 'after' ? `After last page` : 'Custom position'}
            </button>
          ))}
        </div>
        {insertPosition === 'custom' && selectedGap === null && (
          <div className={as.optionRow} style={{ marginTop: 8 }}>
            <span className={as.optionLabel}>Insert before page</span>
            <input
              className={as.posInput}
              type="number" min={1} max={pageCount + 1}
              value={customPos}
              onChange={e => { setCustomPos(e.target.value); setResultBytes(null); }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>of {pageCount}</span>
          </div>
        )}

        {/* Visual gap picker */}
        {pageCount <= 30 && (
          <div className={as.visualGapSection}>
            <p className={as.visualGapHint}>Or click a gap in the page strip:</p>
            <div className={as.gapStrip}>
              {/* Before first page */}
              <button
                className={`${as.gapMarker} ${selectedGap === -1 ? as.gapMarkerActive : ''}`}
                onClick={() => { setSelectedGap(-1); setResultBytes(null); }}
                title="Insert before page 1"
              ><Plus size={10} /></button>
              {Array.from({ length: pageCount }, (_, i) => (
                <React.Fragment key={i}>
                  <div className={as.gapPage} style={{ outline: selectedGap === i - 1 || (selectedGap === null && insertAt === i) ? '2px solid var(--accent)' : undefined }}>
                    {thumbnails[i]
                      ? <img src={thumbnails[i]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span className={as.gapPageNum}>{i + 1}</span>
                    }
                  </div>
                  <button
                    className={`${as.gapMarker} ${selectedGap === i ? as.gapMarkerActive : ''}`}
                    onClick={() => { setSelectedGap(i); setResultBytes(null); }}
                    title={`Insert after page ${i + 1}`}
                  ><Plus size={10} /></button>
                </React.Fragment>
              ))}
            </div>
            {selectedGap !== null && (
              <p className={as.gapInfo}>
                Inserting {pagesAdded} page{pagesAdded !== 1 ? 's' : ''}{' '}
                {selectedGap === -1 ? 'before page 1' : `after page ${selectedGap + 1}`}
                {' '}→ result will have <strong>{newTotal}</strong> pages
                <button className={as.clearGap} onClick={() => setSelectedGap(null)}>Clear</button>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Result preview */}
      {selectedGap === null && (
        <div className={as.resultPreview}>
          <span>Result: <strong>{newTotal}</strong> pages</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            {pagesAdded} page{pagesAdded !== 1 ? 's' : ''} inserted at position {insertAt + 1}
          </span>
        </div>
      )}

      {error && <div className={s.error}><AlertCircle size={14} />{error}</div>}

      {resultBytes ? (
        <div className={s.successCard}>
          <CheckCircle2 className={s.successIcon} size={40} />
          <h3 className={s.successTitle}>Pages Added!</h3>
          <p className={s.successDesc}>Your PDF now has {newTotal} pages.</p>
          <button className={s.downloadBtn} onClick={() => downloadPdf(resultBytes, `${baseName}-with-pages.pdf`)}>
            <Download size={16} />Download PDF ({newTotal} pages)
          </button>
          <button className={s.resetLink} onClick={reset}>Process another file</button>
        </div>
      ) : (
        <div className={s.actionBar} style={{ marginTop: 16 }}>
          <button
            className={`${s.primaryBtn} ${processing ? s.loading : ''}`}
            onClick={handleProcess}
            disabled={processing || (mode === 'pdf' && !insertFile)}
            id="add-page-button"
          >
            <FilePlus size={18} />
            {processing ? 'Processing…' : mode === 'blank' ? `Insert ${blankCount} Blank Page${blankCount !== 1 ? 's' : ''}` : mode === 'pdf' ? 'Insert PDF Pages' : `Duplicate Page ${dupSourcePage} ×${dupCount}`}
          </button>
          <button className={s.secondaryBtn} onClick={reset}><Upload size={14} />Choose different file</button>
        </div>
      )}
    </div>
  );
};
