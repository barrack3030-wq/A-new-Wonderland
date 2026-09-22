import { getCollection } from 'astro:content';

const site = 'https://banggaiwonderland.my.id';
const languages = ['id', 'en', 'es', 'fr', 'zh'];

const staticPages = [
  'about/',
  'destinations/',
  'packages/',
  'blog/',
  'gallery/',
  'book/',
  'contact/',
  'jasa-tour-luwuk-banggai/'
];

const idOnlyStaticPages = [
  'banggai-travel/',
  'banggai-trip/',
  'banggai-open-trip/'
];

export async function GET() {
  const destinations = await getCollection('destinations');
  const packages = await getCollection('packages');
  const blog = await getCollection('blog');

  const urls = new Set<string>();

  for (const lang of languages) {
    urls.add(`${site}/${lang}/`);

    for (const page of staticPages) {
      urls.add(`${site}/${lang}/${page}`);
    }

    if (lang === 'id') {
      for (const page of idOnlyStaticPages) {
        urls.add(`${site}/id/${page}`);
      }
    }
  }

  for (const entry of destinations) {
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
      urls.add(`${site}/${lang}/blog/${parts.join('/')}/`);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    [...urls].sort().map(url => `  <url><loc>${url}</loc></url>`).join('\n') +
    `\n</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8'
    }
  });
}
