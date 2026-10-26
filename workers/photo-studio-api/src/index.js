/**
 * Banggai Wonderland Photo Studio API
 * Deploy as a Cloudflare Worker; protect its hostname with Cloudflare Access.
 * Required Worker variables: CF_ACCESS_TEAM_DOMAIN, CF_ACCESS_AUD, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH.
 * Required Worker secret: GITHUB_TOKEN (repo contents write permission only).
 */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_ORIGIN = 'https://banggaiwonderland.my.id';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (origin && origin !== ALLOWED_ORIGIN) return json({ ok: false, error: 'Origin tidak diizinkan.' }, 403, origin);
    if (new URL(request.url).pathname === '/' && request.method === 'GET') {
      return new Response('Cloudflare Access berhasil memverifikasi identitas. Kembali ke Photo Studio untuk mengunggah foto.', { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
    }
    if (request.method !== 'POST') return json({ ok: false, error: 'Method tidak diizinkan.' }, 405, origin);
    try {
      await requireAccessIdentity(request, env);
      const data = await request.json();
      if (data.action !== 'photoUpload') return json({ ok: false, error: 'Action tidak dikenal.' }, 400, origin);
      const fileName = safeName(data.fileName);
      const match = String(data.dataUrl || '').match(/^data:(image\/webp);base64,([A-Za-z0-9+/=]+)$/);
      if (!match) return json({ ok: false, error: 'Foto harus berupa WebP hasil kompresi.' }, 400, origin);
      const binary = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
      if (!binary.length || binary.length > MAX_IMAGE_BYTES) return json({ ok: false, error: 'Foto WebP maksimal 8 MB.' }, 413, origin);
      const path = 'public/images/blog/' + fileName;
      const url = 'https://api.github.com/repos/' + encodeURIComponent(env.GITHUB_OWNER) + '/' + encodeURIComponent(env.GITHUB_REPO) + '/contents/' + path.split('/').map(encodeURIComponent).join('/');
      const existing = await fetch(url + '?ref=' + encodeURIComponent(env.GITHUB_BRANCH || 'main'), { headers: githubHeaders(env) });
      if (existing.ok) return json({ ok: false, error: 'Nama file sudah ada. Pilih foto atau nama lain.' }, 409, origin);
      if (existing.status !== 404) throw new Error('GitHub tidak dapat memeriksa nama file (' + existing.status + ').');
      const upload = await fetch(url, {
        method: 'PUT',
        headers: { ...githubHeaders(env), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Photo Studio: add ' + fileName,
          content: bytesToBase64(binary),
          branch: env.GITHUB_BRANCH || 'main'
        })
      });
      const result = await upload.json().catch(() => ({}));
      if (!upload.ok) throw new Error('GitHub gagal menyimpan foto (' + upload.status + '): ' + (result.message || 'permintaan ditolak'));
      return json({ ok: true, image: { url: '/images/blog/' + fileName, name: fileName, path } }, 200, origin);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Permintaan upload gagal.';
      const status = /Cloudflare Access|identitas/i.test(message) ? 401 : 400;
      return json({ ok: false, error: message }, status, origin);
    }
  }
};

function githubHeaders(env) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO) throw new Error('Worker belum dikonfigurasi dengan GitHub secret dan repository.');
  return { Authorization: 'Bearer ' + env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
}
function safeName(value) {
  const base = String(value || 'banggai-photo.webp').replace(/\\.[^.]+$/, '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'banggai-photo';
  return base + '.webp';
}
async function requireAccessIdentity(request, env) {
  const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!jwt) throw new Error('Cloudflare Access: identitas tidak terverifikasi. Buka tautan Masuk sebagai pemilik terlebih dahulu.');
  const parts = jwt.split('.');
  if (parts.length !== 3) throw new Error('Cloudflare Access: token identitas tidak valid.');
  let claims;
  try { claims = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch { throw new Error('Cloudflare Access: token identitas tidak valid.'); }
  const team = String(env.CF_ACCESS_TEAM_DOMAIN || '').replace(/\\/$/, '');
  if (!team || !env.CF_ACCESS_AUD || claims.iss !== team || !Array.isArray(claims.aud) || !claims.aud.includes(env.CF_ACCESS_AUD) || !claims.exp || claims.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error('Cloudflare Access: klaim identitas tidak cocok dengan konfigurasi.');
  }
  const keyResponse = await fetch(team + '/cdn-cgi/access/certs', { cf: { cacheTtl: 300 } });
  if (!keyResponse.ok) throw new Error('Cloudflare Access: tidak dapat memverifikasi kunci tanda tangan.');
  const keySet = await keyResponse.json();
  const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
  const key = (keySet.keys || keySet.public_certs || []).find(item => item.kid === header.kid);
  if (!key || header.alg !== 'RS256') throw new Error('Cloudflare Access: tanda tangan token tidak dikenali.');
  let publicKey;
  if (key.kty === 'RSA' && key.n && key.e) {
    publicKey = await crypto.subtle.importKey('jwk', key, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  } else if (key.cert) {
    const spki = extractSpkiFromCertificate(key.cert);
    publicKey = await crypto.subtle.importKey('spki', spki, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  } else {
    throw new Error('Cloudflare Access: format sertifikat tidak didukung.');
  }
  const signature = Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, signature, new TextEncoder().encode(parts[0] + '.' + parts[1]));
  if (!valid) throw new Error('Cloudflare Access: tanda tangan token tidak valid.');
}
function corsHeaders(origin) {
  const headers = { 'Vary': 'Origin', 'Cache-Control': 'no-store' };
  if (origin === ALLOWED_ORIGIN) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }
  return headers;
}
function json(data, status = 200, origin = '') {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json; charset=utf-8' } });
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  return btoa(binary);
}
function extractSpkiFromCertificate(pem) {
  const base64 = String(pem).replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\\s/g, '');
  const der = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  function node(offset) {
    const tag = der[offset];
    let length = der[offset + 1], start = offset + 2;
    if (length & 0x80) {
      const count = length & 0x7f;
      length = 0;
      for (let i = 0; i < count; i++) length = length * 256 + der[start + i];
      start += count;
    }
    return { tag, start, end: start + length };
  }
  const cert = node(0);
  const tbs = node(cert.start);
  let cursor = tbs.start;
  let item = node(cursor);
  if (item.tag === 0xa0) { cursor = item.end; item = node(cursor); }
  // serial, signature, issuer, validity, subject, then SubjectPublicKeyInfo
  for (let i = 0; i < 5; i++) { cursor = item.end; item = node(cursor); }
  if (item.tag !== 0x30) throw new Error('Cloudflare Access: sertifikat tidak valid.');
  return der.slice(cursor, item.end);
}
