import { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { blogPosts } from './blogData';

export const metadata: Metadata = {
  title: "PDF Merger Blog - Tips, Guides & PDF How-Tos",
  description: "Free guides and tips on merging PDFs, combining documents, and protecting your privacy when using online PDF tools.",
  alternates: { canonical: '/blog' },
};

export default function BlogPage() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8 }}>PDF Guides & Blog</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 40 }}>
          Tips, tutorials, and guides about working with PDF files.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              style={{
                display: 'block',
                padding: '24px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                transition: 'all 0.2s ease',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                {post.date} · {post.readTime}
              </div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.4 }}>
                {post.title}
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {post.description}
              </p>
              <div style={{ marginTop: 12, fontSize: '0.813rem', color: 'var(--accent)', fontWeight: 600 }}>
                Read guide →
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
