import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MergePDF - Free Online PDF Merger & Combiner (No Upload)",
    template: "%s | MergePDF - Free PDF Tools",
  },
  description: "Merge, combine, and split PDF files online for free. 100% private — all processing happens in your browser. No server uploads, no sign-up required.",
  keywords: [
    "merge pdf online free",
    "combine pdf files free",
    "pdf merger online",
    "merge pdf without uploading",
    "combine pdf locally browser",
    "split pdf online free no sign up",
    "pdf combiner free",
    "join pdf files online",
    "merge pdf no registration",
    "free pdf tools online",
  ],
  authors: [{ name: "MergePDF Team" }],
  creator: "MergePDF",
  publisher: "MergePDF",
  formatDetection: { email: false, address: false, telephone: false },
  metadataBase: new URL("https://mergepdf.mydigitsign.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "MergePDF - Free Online PDF Merger (No Upload, 100% Private)",
    description: "Merge, combine, and split PDF files free in your browser. Your files never touch a server.",
    url: "https://mergepdf.mydigitsign.com",
    siteName: "MergePDF",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "MergePDF - Free Online PDF Merger" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MergePDF - Free Online PDF Merger (No Upload, 100% Private)",
    description: "Merge, combine, and split PDF files free. No server uploads ever.",
    creator: "@mergepdf",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": "https://mergepdf.mydigitsign.com/#webapp",
      "name": "MergePDF",
      "url": "https://mergepdf.mydigitsign.com",
      "operatingSystem": "All",
      "applicationCategory": "UtilitiesApplication",
      "applicationSubCategory": "PDF Tools",
      "offers": { "@type": "Offer", "price": "0.00", "priceCurrency": "USD" },
      "description": "Free browser-based PDF merger and splitter. Combine or split PDF files locally without uploading to any server.",
      "browserRequirements": "Requires HTML5 compatible browser",
    },
    {
      "@type": "WebSite",
      "@id": "https://mergepdf.mydigitsign.com/#website",
      "name": "MergePDF",
      "url": "https://mergepdf.mydigitsign.com",
      "description": "Free online PDF merger — no uploads, 100% private.",
    },
    {
      "@type": "Organization",
      "@id": "https://mergepdf.mydigitsign.com/#organization",
      "name": "MergePDF",
      "url": "https://mergepdf.mydigitsign.com",
    },
  ],
};

const themeScript = `
  (function() {
    try {
      var saved = localStorage.getItem('theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var theme = saved || (prefersDark ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);
    } catch(e) {}
  })();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
