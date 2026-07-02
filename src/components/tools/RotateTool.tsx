'use client';

import React, { useRef, useState, useCallback } from 'react';
import { RotateCw, FileText, Upload, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { PDFDocument, degrees } from 'pdf-lib';
import { downloadPdf, renderAllThumbnails } from '@/components/pdf/pdfUtils';
import s from './ToolShell.module.css';

// Rotation stored per page: 0, 90, 180, 270
type RotationMap = Record<number, number>;

// Visual rotation applied on thumbnail
const ROTATE_DEG_TO_STYLE: Record<number, string> = {
  0: 'rotate(0deg)',
  90: 'rotate(90deg)',
  180: 'rotate(180deg)',
  270: 'rotate(270deg)',
};

export const RotateTool: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loadingProgress, setLoadingProgress] = useState<{ done: number; total: number } | null>(null);
  const [rotations, setRotations] = useState<RotationMap>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const loadFile = useCallback(async (f: File) => {
    setFile(f); setThumbnails([]); setRotations({}); setSelected(new Set());
    setResultBytes(null); setError(null);
    setLoadingProgress({ done: 0, total: 0 });
    try {
      const thumbs = await renderAllThumbnails(f, 0.28, (done, total) => setLoadingProgress({ done, total }));
      setThumbnails(thumbs);
    } catch {
      setError('Could not render thumbnails.');
    } finally {
      setLoadingProgress(null);
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type === 'application/pdf' || f.name.endsWith('.pdf'))) loadFile(f);
  };

  const toggleSelect = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(thumbnails.map((_, i) => i)));
  const clearSelection = () => setSelected(new Set());

  /** Apply rotation increment to selected pages (or all if none selected) */
  const applyRotation = (delta: 90 | -90 | 180) => {
    const targets = selected.size > 0 ? Array.from(selected) : thumbnails.map((_, i) => i);
    setRotations((prev) => {
      const next = { ...prev };
      for (const i of targets) {
        const cur = next[i] ?? 0;
        next[i] = ((cur + delta) % 360 + 360) % 360;
      }
      return next;
    });
    setResultBytes(null);
  };

  const handleApply = async () => {
    if (!file) return;
    setProcessing(true); setError(null);
    try {
      const buf = await file.arrayBuffer();
      const doc = await PDFDocument.load(buf);
      for (const [idxStr, rot] of Object.entries(rotations)) {
        const pageIndex = parseInt(idxStr, 10);
        const page = doc.getPage(pageIndex);
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees((currentRotation + rot) % 360));
      }
      setResultBytes(await doc.save());
    } catch {
      setError('Failed to apply rotations. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null); setThumbnails([]); setRotations({}); setSelected(new Set());
    setResultBytes(null); setError(null); setLoadingProgress(null);
  };

  const rotatedCount = Object.values(rotations).filter((r) => r !== 0).length;
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
        <div className={s.uploadIcon}><RotateCw size={26} /></div>
        <p className={s.uploadTitle}>Drop a PDF to rotate pages</p>
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

      {thumbnails.length > 0 && (
        <>
          {/* Selection + rotate controls */}
          <div className={s.selectBar}>
            <button className={s.selectBarBtn} onClick={selectAll}>Select All</button>
            <button className={s.selectBarBtn} onClick={clearSelection}>Clear</button>
            {selected.size > 0 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {selected.size} selected
              </span>
            )}
          </div>

          <div className={s.rotateBar}>
            <span className={s.rotateBarLabel}>Rotate {selected.size > 0 ? 'selected' : 'all'}:</span>
            <button className={s.rotateChip} onClick={() => applyRotation(90)}>
              <RotateCw size={13} />90° CW
            </button>
            <button className={s.rotateChip} onClick={() => applyRotation(-90)} style={{ transform: 'scaleX(-1)' }}>
              <RotateCw size={13} />90° CCW
            </button>
            <button className={s.rotateChip} onClick={() => applyRotation(180)}>
              <RotateCw size={13} />180°
            </button>
            {rotatedCount > 0 && (
              <button
                className={s.clearBtn}
                onClick={() => { setRotations({}); setResultBytes(null); }}
                style={{ marginLeft: 'auto' }}
              >
                Reset all
              </button>
            )}
          </div>

          {/* Page grid */}
          <div className={s.pageGrid}>
            {thumbnails.map((thumb, i) => {
              const rot = rotations[i] ?? 0;
              const isSelected = selected.has(i);
              return (
                <div key={i} className={s.pageTile} onClick={() => toggleSelect(i)}>
                  <div className={`${s.pageTileThumb} ${isSelected ? s.rotated : ''}`}
                    style={{ borderColor: isSelected ? 'var(--accent)' : rot !== 0 ? 'var(--warning)' : undefined }}>
                    <img
                      src={thumb}
                      alt={`Page ${i + 1}`}
                      style={{ transform: ROTATE_DEG_TO_STYLE[rot], transformOrigin: 'center', transition: 'transform 0.3s ease' }}
                    />
                    <div className={s.pageTileOverlay}>
                      {rot !== 0 && (
                        <div className={`${s.pageTileBadge} ${s.pageTileBadgeRotate}`}>{rot}°</div>
                      )}
                    </div>
                  </div>
                  <span className={s.pageTileLabel} style={{ color: isSelected ? 'var(--accent)' : undefined }}>
                    p.{i + 1}
                  </span>
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
          <h3 className={s.successTitle}>Rotations Applied!</h3>
          <p className={s.successDesc}>{rotatedCount} page{rotatedCount !== 1 ? 's' : ''} rotated.</p>
          <button className={s.downloadBtn} onClick={() => downloadPdf(resultBytes, `${baseName}-rotated.pdf`)}>
            <Download size={16} />Download PDF
          </button>
          <button className={s.resetLink} onClick={reset}>Process another file</button>
        </div>
      ) : (
        thumbnails.length > 0 && (
          <div className={s.actionBar}>
            <button
              className={`${s.primaryBtn} ${processing ? s.loading : ''}`}
              onClick={handleApply}
              disabled={processing || rotatedCount === 0}
              id="rotate-apply-button"
            >
              <RotateCw size={18} />
              {processing ? 'Applying…' : rotatedCount > 0 ? `Apply ${rotatedCount} Rotation${rotatedCount !== 1 ? 's' : ''}` : 'Rotate pages above, then apply'}
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
