export function GET() {
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin/',
    'Disallow: /cms/',
    'Disallow: /seo-lab/',
    'Disallow: /plan/',
    '',
    'Sitemap: https://banggaiwonderland.my.id/sitemap.xml'
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}
