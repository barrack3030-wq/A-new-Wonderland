import { getCollection } from 'astro:content';

export const prerender = true;

const site = 'https://banggaiwonderland.my.id';
const languages = ['id', 'en', 'es', 'fr'];

// Only include universal static pages here. Collection archives are added below
// only for languages that actually have content, avoiding empty archive URLs.
const staticPages = [
  'about/',
  'gallery/',
  'book/',
  'contact/',
  'jasa-tour-luwuk-banggai/'
];

const localizedLandingPages = [
  'banggai-travel/',
  'banggai-trip/',
  'banggai-open-trip/'
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const destinations = await getCollection('destinations');
  const packages = await getCollection('packages');
  const blog = await getCollection('blog');

  const urls = new Set<string>();
  // Only blog posts carry a real date (updatedDate falls back to pubDate); other URLs get no <lastmod>.
  const lastmod = new Map<string, string>();

  for (const lang of languages) {
    urls.add(`${site}/${lang}/`);

    for (const page of staticPages) {
      urls.add(`${site}/${lang}/${page}`);
    }

    if (lang === 'id') {
      for (const page of localizedLandingPages) {
        urls.add(`${site}/${lang}/${page}`);
      }
    }

    if (destinations.some(entry => entry.slug.startsWith(`${lang}/`))) {
      urls.add(`${site}/${lang}/destinations/`);
    }
    if (packages.some(entry => entry.slug.startsWith(`${lang}/`))) {
      urls.add(`${site}/${lang}/packages/`);
    }
    if (blog.some(entry => entry.slug.startsWith(`${lang}/`))) {
      urls.add(`${site}/${lang}/blog/`);
    }
  }

  for (const entry of destinations) {
    if (entry.data.noindex) continue;
    const [lang, ...parts] = entry.slug.split('/');
    if (languages.includes(lang) && parts.length) {
      urls.add(`${site}/${lang}/destinations/${parts.join('/')}/`);
    }
  }

  for (const entry of packages) {
    const [lang, ...parts] = entry.slug.split('/');
    if (languages.includes(lang) && parts.length) {
      urls.add(`${site}/${lang}/packages/${parts.join('/')}/`);
    }
  }

  for (const entry of blog) {
    const [lang, ...parts] = entry.slug.split('/');
    if (languages.includes(lang) && parts.length) {
      const postUrl = `${site}/${lang}/blog/${parts.join('/')}/`;
      urls.add(postUrl);
      const modified = entry.data.updatedDate ?? entry.data.pubDate;
      if (modified) lastmod.set(postUrl, modified.toISOString().slice(0, 10));
    }
  }

  const urlEntries = [...urls].sort()
    .map(url => `  <url><loc>${escapeXml(url)}</loc>${lastmod.has(url) ? `<lastmod>${lastmod.get(url)}</lastmod>` : ''}</url>`)
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urlEntries +
    `\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate'
    }
  });
}
