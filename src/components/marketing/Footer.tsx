import React from 'react';
import Link from 'next/link';
import { FileStack, ShieldCheck } from 'lucide-react';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <FileStack size={16} />
          MergePDF
        </div>

        <div className={styles.privacyBadge}>
          <ShieldCheck size={12} />
          Files never leave your browser — 100% private
        </div>

        <nav className={styles.links}>
          <Link href="/how-it-works" className={styles.link}>How It Works</Link>
          <Link href="/blog" className={styles.link}>Blog</Link>
          <Link href="/privacy-policy" className={styles.link}>Privacy Policy</Link>
          <Link href="/terms-of-service" className={styles.link}>Terms of Service</Link>
        </nav>

        <p className={styles.copy}>
          © {new Date().getFullYear()} MergePDF — Free PDF Merger Tool. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
