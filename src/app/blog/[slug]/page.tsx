import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { blogPosts } from '../blogData';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
    },
  };
}

// Simple markdown-like renderer for our content
function renderContent(content: string) {
  const lines = content.trim().split('\n');
  return lines.map((line, i) => {
    if (line.startsWith('## ')) return <h2 key={i} style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: 32, marginBottom: 12 }}>{line.slice(3)}</h2>;
    if (line.startsWith('### ')) return <h3 key={i} style={{ fontSize: '1rem', fontWeight: 700, marginTop: 20, marginBottom: 8 }}>{line.slice(4)}</h3>;
    if (line.startsWith('- ')) return <li key={i} style={{ marginLeft: 20, marginBottom: 4, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{line.slice(2)}</li>;
    if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ') || line.startsWith('4. ') || line.startsWith('5. ')) {
      return <li key={i} style={{ marginLeft: 20, marginBottom: 4, color: 'var(--text-secondary)', lineHeight: 1.6, listStyleType: 'decimal' }}>{line.slice(3)}</li>;
    }
    if (line.startsWith('| ')) {
      return <div key={i} style={{ fontFamily: 'monospace', fontSize: '0.813rem', padding: '4px 0', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>{line}</div>;
    }
    if (line.trim() === '') return <br key={i} />;
    return <p key={i} style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 8 }}>{line}</p>;
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) notFound();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.description,
    "datePublished": post.date,
    "author": { "@type": "Organization", "name": "MergePDF" },
    "publisher": { "@type": "Organization", "name": "MergePDF", "url": "https://mergepdf.mydigitsign.com" },
    "url": `https://mergepdf.mydigitsign.com/blog/${slug}`,
  };

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
        />

        <Link href="/blog" style={{ fontSize: '0.813rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 24 }}>
          ← Back to Blog
        </Link>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          {post.date} · {post.readTime}
        </div>

        <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, lineHeight: 1.3, marginBottom: 16 }}>
          {post.title}
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: 40, lineHeight: 1.6, borderBottom: '1px solid var(--border)', paddingBottom: 24 }}>
          {post.description}
        </p>

        <article style={{ fontSize: '0.9375rem' }}>
          {renderContent(post.content)}
        </article>

        {/* CTA */}
        <div style={{
          marginTop: 48, padding: 28,
          background: 'var(--accent-light)', border: '1px solid var(--accent)',
          borderRadius: 12, textAlign: 'center',
        }}>
          <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Ready to merge your PDFs?
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Free, private, no account needed.
          </p>
          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 24px', background: 'var(--accent)', color: '#fff',
            borderRadius: 8, fontWeight: 700, fontSize: '0.875rem',
          }}>
            Merge PDFs Now →
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
