import { Metadata } from 'next';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';

export const metadata: Metadata = {
  title: "Privacy Policy - MergePDF",
  description: "MergePDF's privacy policy. All PDF processing is done 100% in your browser. No files, data, or personal information is ever uploaded to our servers.",
  alternates: { canonical: '/privacy-policy' },
};

export default function PrivacyPolicy() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 40, fontSize: '0.875rem' }}>Last updated: July 1, 2026</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: 8 }}>1. Zero Server Processing</h2>
            <p>MergePDF does not upload, store, or process your PDF files on any server. All merging and splitting operations are performed entirely within your local web browser using client-side JavaScript (pdf-lib). When you close the browser tab, all data is permanently cleared from memory.</p>
          </section>
          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: 8 }}>2. Information We Collect</h2>
            <p>We do not collect your name, email address, or any personal information to use MergePDF. We may collect minimal, anonymized analytics (page views) to understand usage trends. No personally identifiable information is included in this data.</p>
          </section>
          <section>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: 8 }}>3. Contact</h2>
            <p>For privacy concerns, contact: <a href="mailto:alimirza00@gmail.com" style={{ color: 'var(--accent)' }}>alimirza00@gmail.com</a></p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
