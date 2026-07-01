'use client';

import React, { useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Merge, Download, RotateCcw, Plus, ShieldCheck,
  Zap, Lock, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { PdfUploader } from '@/components/pdf/PdfUploader';
import { PdfFileCard, type PdfFile } from '@/components/pdf/PdfFileCard';
import { mergePdfs, downloadPdf } from '@/components/pdf/pdfMerger';
import styles from './page.module.css';

export default function Home() {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedBytes, setMergedBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dragIndex = useRef<number | null>(null);
  const addMoreRef = useRef<HTMLInputElement>(null);

  const handleFilesAdded = (newFiles: File[]) => {
    const pdfFiles: PdfFile[] = newFiles.map((file) => ({
      id: uuidv4(),
      file,
    }));
    setFiles((prev) => [...prev, ...pdfFiles]);
    setMergedBytes(null);
    setError(null);
  };

  const handleRemove = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setMergedBytes(null);
  };

  const handleDragStart = (index: number) => { dragIndex.current = index; };

  const handleDragOver = (overIndex: number) => {
    if (dragIndex.current === null || dragIndex.current === overIndex) return;
    setFiles((prev) => {
      const arr = [...prev];
      const [dragged] = arr.splice(dragIndex.current!, 1);
      arr.splice(overIndex, 0, dragged);
      dragIndex.current = overIndex;
      return arr;
    });
  };

  const handleDragEnd = () => { dragIndex.current = null; };

  const handleMerge = async () => {
    if (files.length < 2) {
      setError('Please add at least 2 PDF files to merge.');
      return;
    }
    setIsMerging(true);
    setError(null);
    try {
      const bytes = await mergePdfs(files);
      setMergedBytes(bytes);
    } catch (err) {
      console.error(err);
      setError('Failed to merge PDFs. Please ensure all files are valid PDF documents.');
    } finally {
      setIsMerging(false);
    }
  };

  const handleDownload = () => {
    if (mergedBytes) downloadPdf(mergedBytes, 'merged-document.pdf');
  };

  const handleReset = () => {
    setFiles([]);
    setMergedBytes(null);
    setError(null);
  };

  const handleAddMore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (newFiles.length) handleFilesAdded(newFiles);
    e.target.value = '';
  };

  const totalPages = files.reduce((sum, f) => sum + (f.pageCount || 0), 0);

  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>
        <div className={styles.container}>
          {/* Hero */}
          <div className={styles.hero}>
            <div className={styles.badge}>
              <ShieldCheck size={12} />
              No uploads · 100% Private · Free Forever
            </div>
            <h1 className={styles.heroTitle}>
              Merge PDF Files <span>Online for Free</span>
            </h1>
            <p className={styles.heroDesc}>
              Combine multiple PDF documents into one file instantly.
              All processing happens locally in your browser — your files never touch a server.
            </p>
          </div>

          {/* Main Tool */}
          {files.length === 0 ? (
            <PdfUploader onFilesAdded={handleFilesAdded} />
          ) : (
            <>
              {/* File list */}
              <div className={styles.fileListHeader}>
                <span className={styles.fileListTitle}>
                  {files.length} file{files.length !== 1 ? 's' : ''} selected
                  {totalPages > 0 && ` · ${totalPages} total pages`}
                </span>
                <span className={styles.fileCount}>Drag to reorder</span>
              </div>

              <div className={styles.fileList}>
                {files.map((pdfFile, index) => (
                  <PdfFileCard
                    key={pdfFile.id}
                    pdfFile={pdfFile}
                    index={index}
                    onRemove={handleRemove}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    isDragging={dragIndex.current === index}
                  />
                ))}
              </div>

              {/* Add more */}
              <label className={styles.addMoreBtn}>
                <Plus size={16} />
                Add More PDFs
                <input
                  ref={addMoreRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleAddMore}
                />
              </label>

              {/* Error */}
              {error && (
                <div className={styles.errorMsg}>
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {/* Merged success state */}
              {mergedBytes ? (
                <div className={styles.successCard}>
                  <CheckCircle2 className={styles.successIcon} size={40} />
                  <h2 className={styles.successTitle}>PDF Merged Successfully!</h2>
                  <p className={styles.successDesc}>
                    Your {files.length} PDFs have been combined into one document locally in your browser.
                  </p>
                  <button className={styles.downloadBtn} onClick={handleDownload}>
                    <Download size={16} />
                    Download Merged PDF
                  </button>
                  <button className={styles.mergeAgainBtn} onClick={handleReset}>
                    Start over with new files
                  </button>
                </div>
              ) : (
                <div className={styles.actionBar}>
                  <button
                    className={`${styles.mergeBtn} ${isMerging ? styles.mergeBtnLoading : ''}`}
                    onClick={handleMerge}
                    disabled={isMerging || files.length < 2}
                    id="merge-button"
                  >
                    <Merge size={18} />
                    {isMerging ? 'Merging PDFs...' : `Merge ${files.length} PDFs into One`}
                  </button>
                  <button className={styles.resetBtn} onClick={handleReset}>
                    <RotateCcw size={14} />
                    Clear all files
                  </button>
                </div>
              )}
            </>
          )}

          {/* Trust row */}
          <div className={styles.trustRow}>
            <div className={styles.trustItem}>
              <Lock size={14} className={styles.trustIcon} />
              Files never leave your device
            </div>
            <div className={styles.trustItem}>
              <Zap size={14} className={styles.trustIcon} />
              Instant browser-side processing
            </div>
            <div className={styles.trustItem}>
              <ShieldCheck size={14} className={styles.trustIcon} />
              No sign-up required
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
