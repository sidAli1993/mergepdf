'use client';

import React, { useState } from 'react';
import {
  Merge, Scissors, Eraser, FilePlus, Tag, RotateCw,
  ShieldCheck, Lock, Zap
} from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { MergeTool } from '@/components/tools/MergeTool';
import { SplitTool } from '@/components/tools/SplitTool';
import { RemovePagesTool } from '@/components/tools/RemovePagesTool';
import { AddPageTool } from '@/components/tools/AddPageTool';
import { RenameTool } from '@/components/tools/RenameTool';
import { RotateTool } from '@/components/tools/RotateTool';
import styles from './page.module.css';

type ToolId = 'merge' | 'split' | 'remove' | 'add' | 'rename' | 'rotate';

interface Tool {
  id: ToolId;
  icon: React.ReactNode;
  label: string;
  title: string;
  titleHighlight: string;
  desc: string;
  component: React.ReactNode;
}

const TOOLS: Tool[] = [
  {
    id: 'merge',
    icon: <Merge size={18} />,
    label: 'Merge',
    title: 'Merge PDF Files',
    titleHighlight: 'Online for Free',
    desc: 'Combine multiple PDF documents into one file instantly. Drag to reorder before merging.',
    component: <MergeTool />,
  },
  {
    id: 'split',
    icon: <Scissors size={18} />,
    label: 'Split',
    title: 'Split PDF',
    titleHighlight: 'by Pages or Ranges',
    desc: 'Extract page ranges or split a PDF into equal parts. Each part downloads as a separate file.',
    component: <SplitTool />,
  },
  {
    id: 'remove',
    icon: <Eraser size={18} />,
    label: 'Remove Pages',
    title: 'Remove PDF Pages',
    titleHighlight: 'with Visual Picker',
    desc: 'Click on any page thumbnail to mark it for removal, then download the cleaned PDF.',
    component: <RemovePagesTool />,
  },
  {
    id: 'add',
    icon: <FilePlus size={18} />,
    label: 'Add Page',
    title: 'Add or Insert Pages',
    titleHighlight: 'at Any Position',
    desc: 'Insert a blank page or another PDF\'s pages at any position within your document.',
    component: <AddPageTool />,
  },
  {
    id: 'rename',
    icon: <Tag size={18} />,
    label: 'Rename',
    title: 'Rename PDF Files',
    titleHighlight: 'Instantly & Free',
    desc: 'Edit filenames and download your PDFs with new names. Supports batch renaming.',
    component: <RenameTool />,
  },
  {
    id: 'rotate',
    icon: <RotateCw size={18} />,
    label: 'Rotate Pages',
    title: 'Rotate PDF Pages',
    titleHighlight: '90°, 180° or 270°',
    desc: 'Click pages to select them, choose your rotation, and download the corrected PDF.',
    component: <RotateTool />,
  },
];

export default function Home() {
  const [activeId, setActiveId] = useState<ToolId>('merge');
  const activeTool = TOOLS.find((t) => t.id === activeId)!;

  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>
        <div className={styles.container}>

          {/* Tab bar */}
          <div className={styles.tabBar} role="tablist" aria-label="PDF Tools">
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                role="tab"
                aria-selected={activeId === tool.id}
                className={`${styles.tab} ${activeId === tool.id ? styles.tabActive : ''}`}
                onClick={() => setActiveId(tool.id)}
                id={`tab-${tool.id}`}
              >
                {tool.icon}
                <span className={styles.tabLabel}>{tool.label}</span>
              </button>
            ))}
          </div>

          {/* Hero */}
          <div className={styles.hero}>
            <div className={styles.badge}>
              <ShieldCheck size={12} />
              No uploads · 100% Private · Free Forever
            </div>
            <h1 className={styles.heroTitle}>
              {activeTool.title}{' '}
              <span>{activeTool.titleHighlight}</span>
            </h1>
            <p className={styles.heroDesc}>{activeTool.desc}</p>
          </div>

          {/* Tool panel */}
          <div className={styles.toolPanel} role="tabpanel" aria-labelledby={`tab-${activeId}`}>
            {activeTool.component}
          </div>

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
