import { Metadata } from 'next';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';

export const metadata: Metadata = {
  title: "Terms of Service - MergePDF",
  description: "MergePDF terms of service. Free to use for personal and commercial use. No liability for merged documents. Your files are never uploaded.",
  alternates: { canonical: '/terms-of-service' },
};

export default function TermsOfService() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 40, fontSize: '0.875rem' }}>Last updated: July 1, 2026</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: 8 }}>1. Free Use</h2>
            <p>MergePDF is a free tool for merging PDF files. You may use it for personal and commercial purposes without charge. No account is required.</p>
          </section>
          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: 8 }}>2. Acceptable Use</h2>
            <p>You agree to only merge PDF files you have the legal right to access, copy, and combine. Do not use MergePDF to process files containing illegal content.</p>
          </section>
          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: 8 }}>3. Disclaimer</h2>
            <p>MergePDF is provided "as is." We make no warranties about accuracy or fitness for any particular purpose. We are not liable for data loss. Always keep backups of your original files.</p>
          </section>
          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: 8 }}>4. Contact</h2>
            <p>Questions? Email us at: <a href="mailto:alimirza00@gmail.com" style={{ color: 'var(--accent)' }}>alimirza00@gmail.com</a></p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
