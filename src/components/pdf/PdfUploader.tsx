'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, Plus } from 'lucide-react';
import styles from './PdfUploader.module.css';

interface PdfUploaderProps {
  onFilesAdded: (files: File[]) => void;
  hasFiles?: boolean;
}

export const PdfUploader: React.FC<PdfUploaderProps> = ({ onFilesAdded, hasFiles }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const pdfs = Array.from(fileList).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (pdfs.length > 0) onFilesAdded(pdfs);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      className={`${styles.uploader} ${isDragOver ? styles.uploaderActive : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="Upload PDF files"
    >
      <UploadCloud className={styles.icon} size={48} strokeWidth={1.5} />
      <h2 className={styles.title}>
        {hasFiles ? 'Add More PDFs' : 'Drop PDF files here'}
      </h2>
      <p className={styles.subtitle}>or click to browse your computer</p>
      <p className={styles.formats}>Supports PDF files · Max 50MB each</p>

      <div className={styles.browseBtn}>
        <Plus size={16} />
        {hasFiles ? 'Add More Files' : 'Select PDF Files'}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className={styles.hiddenInput}
        onChange={(e) => handleFiles(e.target.files)}
        id="pdf-upload-input"
      />
    </div>
  );
};
