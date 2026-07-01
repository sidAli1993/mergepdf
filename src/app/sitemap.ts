import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://mergepdf.mydigitsign.com';

  const staticPages = [
    { path: '/how-it-works', changeFrequency: 'monthly' as const, priority: 0.9 },
    { path: '/privacy-policy', changeFrequency: 'yearly' as const, priority: 0.3 },
    { path: '/terms-of-service', changeFrequency: 'yearly' as const, priority: 0.3 },
  ];

  const blogPosts = [
    '/blog',
    '/blog/how-to-merge-pdf-files-online-free',
    '/blog/is-it-safe-to-upload-pdfs-online',
    '/blog/combine-pdf-without-adobe-acrobat',
  ];

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    ...staticPages.map((p) => ({
      url: `${baseUrl}${p.path}`,
      lastModified: new Date(),
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    })),
    ...blogPosts.map((slug) => ({
      url: `${baseUrl}${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
