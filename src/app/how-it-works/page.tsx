import { Metadata } from 'next';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';

export const metadata: Metadata = {
  title: "How to Merge PDF Files Online - Step-by-Step Guide",
  description: "Learn how to merge and combine PDF files online for free in 3 simple steps using MergePDF. No uploads, no sign-up, 100% private.",
  keywords: ["how to merge pdf files", "combine pdf step by step", "merge pdf tutorial", "pdf merger guide"],
  alternates: { canonical: '/how-it-works' },
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Merge PDF Files Online for Free",
  "description": "Combine multiple PDF files into one document in 3 simple steps using MergePDF.",
  "step": [
    {
      "@type": "HowToStep",
      "name": "Upload Your PDF Files",
      "text": "Drag and drop your PDF files onto the upload area, or click to browse your computer. You can select multiple files at once.",
      "url": "https://mergepdf.mydigitsign.com/how-it-works"
    },
    {
      "@type": "HowToStep",
      "name": "Reorder Files (Optional)",
      "text": "Drag the file cards to rearrange the order in which the PDFs will be merged. The top file becomes the first section of the final document.",
      "url": "https://mergepdf.mydigitsign.com/how-it-works"
    },
    {
      "@type": "HowToStep",
      "name": "Merge and Download",
      "text": "Click the 'Merge PDFs' button. All processing happens instantly in your browser. Download the final merged PDF file to your device.",
      "url": "https://mergepdf.mydigitsign.com/how-it-works"
    }
  ]
};

export default function HowItWorks() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
        />
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8 }}>How It Works</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 40 }}>
          MergePDF processes your files entirely inside your browser — no server, no uploads, no accounts.
        </p>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {[
            { n: '01', title: 'Upload Your PDFs', body: 'Drag and drop any number of PDF files onto the upload zone, or click to select them from your computer. You can add files from multiple locations.' },
            { n: '02', title: 'Reorder If Needed', body: 'See all your files listed as cards with page count and thumbnail preview. Drag any card up or down to set the exact order you want in the final merged PDF.' },
            { n: '03', title: 'Merge & Download', body: 'Click the Merge button. Our tool uses pdf-lib to combine the files completely within your browser memory. The finished PDF is ready to download in seconds — no server ever sees your data.' },
          ].map(({ n, title, body }) => (
            <div key={n} style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <div style={{
                minWidth: 48, height: 48, borderRadius: 12,
                background: 'var(--accent-light)', color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '0.9rem', flexShrink: 0,
              }}>{n}</div>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: 6 }}>{title}</h2>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{body}</p>
              </div>
            </div>
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
}
