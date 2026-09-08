const TG = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const GH = 'https://api.github.com';
const LANGS = ['id', 'en', 'es', 'fr', 'zh'];

const env = (n) => {
  if (!process.env[n]) throw new Error(`Missing ${n}`);
  return process.env[n];
};

async function tg(method, body) {
  const r = await fetch(`${TG}/${method}`, {
    method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)
  });
  const d = await r.json();
  if (!d.ok) throw new Error(`Telegram: ${d.description || 'failed'}`);
  return d.result;
}

function ghPath(path) {
  return `/repos/${env('GITHUB_OWNER')}/${env('GITHUB_REPO')}/contents/${path}`;
}

async function gh(path, options = {}) {
  const r = await fetch(`${GH}${path}`, {
    ...options,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${env('GITHUB_TOKEN')}`,
      'x-github-api-version': '2022-11-28',
      ...(options.body ? {'content-type': 'application/json'} : {})
    }
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`GitHub: ${d.message || 'failed'}`);
  return d;
}

async function readFile(path) {
  const d = await gh(ghPath(path));
  return { sha: d.sha, content: Buffer.from(d.content.replace(/\n/g, ''), 'base64').toString('utf8') };
}

async function writeFile(path, content, message) {
  let sha;
  try { sha = (await readFile(path)).sha; } catch (e) {
    if (!String(e.message).includes('Not Found')) throw e;
  }
  const body = {
    message,
    content: Buffer.from(content, 'utf8').toString('base64'),
    branch: process.env.GITHUB_BRANCH || 'main'
  };
  if (sha) body.sha = sha;
  return gh(ghPath(path), {method: 'PUT', body: JSON.stringify(body)});
}

async function deleteFile(path, message) {
  const f = await readFile(path);
  return gh(ghPath(path), {method: 'DELETE', body: JSON.stringify({
    message, sha: f.sha, branch: process.env.GITHUB_BRANCH || 'main'
  })});
}

async function ai(prompt) {
  const r = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {'content-type': 'application/json', authorization: `Bearer ${env('OPENAI_API_KEY')}`},
    body: JSON.stringify({
      model: env('OPENAI_MODEL'),
      input: prompt,
      text: {format: {type: 'json_object'}}
    })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`OpenAI: ${d.error?.message || 'failed'}`);
  const text = d.output_text || d.output?.flatMap(x => x.content || []).map(x => x.text || '').join('');
  if (!text) throw new Error('OpenAI returned no text');
  return JSON.parse(text);
}

const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80);
const y = (s) => `'${String(s ?? '').replace(/'/g, "''")}'`;
const draftPath = (chatId) => `.telegram-drafts/${chatId}.json`;

function markdown(a, shared) {
  const tags = (a.tags || []).map(t => `  - ${y(t)}`).join('\n');
  return `---\ntitle: ${y(a.title)}\ndescription: ${y(a.description)}\nseoTitle: ${y(a.seoTitle || a.title)}\nseoDescription: ${y(a.seoDescription || a.description)}\nimage: ${shared.image}\nimageAlt: ${y(shared.imageAlt || a.title)}\nauthor: ${y(shared.author || 'aji')}\npubDate: ${shared.pubDate}\ntags:\n${tags}\n---\n\n${a.body.trim()}\n`;
}

function authorized(message) {
  const chatOk = !process.env.TELEGRAM_ALLOWED_CHAT_ID || String(message.chat.id) === String(process.env.TELEGRAM_ALLOWED_CHAT_ID);
  const userOk = !process.env.TELEGRAM_ALLOWED_USER_ID || String(message.from?.id) === String(process.env.TELEGRAM_ALLOWED_USER_ID);
  return chatOk && userOk;
}

async function send(chatId, text) {
  return tg('sendMessage', {chat_id: chatId, text, disable_web_page_preview: true});
}

async function makeDraft(chatId, topic) {
  const prompt = `You are the editorial AI for Banggai Wonderland, a premium international travel website about Luwuk and Banggai, Indonesia.\n\nCreate one professional SEO-friendly blog article about: ${topic}\n\nGenerate five natural, semantically aligned versions in Indonesian (id), English (en), Spanish (es), French (fr), and Chinese (zh). Do not invent exact prices, schedules, permits, or uncertain facts. Avoid generic AI filler. Use Markdown headings in each body. Do not put YAML frontmatter in body. Use this existing shared featured image in all languages: /images/Poganda-Beach-Banggai-IndonesiaJuara-Trip.webp. Inline images may only use paths you are certain already exist.\n\nReturn JSON only:\n{"slug":"english-kebab-case","image":"/images/Poganda-Beach-Banggai-IndonesiaJuara-Trip.webp","imageAlt":"...","author":"aji","pubDate":"${new Date().toISOString()}","articles":{"id":{"title":"","description":"","seoTitle":"","seoDescription":"","tags":[],"body":""},"en":{"title":"","description":"","seoTitle":"","seoDescription":"","tags":[],"body":""},"es":{"title":"","description":"","seoTitle":"","seoDescription":"","tags":[],"body":""},"fr":{"title":"","description":"","seoTitle":"","seoDescription":"","tags":[],"body":""},"zh":{"title":"","description":"","seoTitle":"","seoDescription":"","tags":[],"body":""}}}`;
  const d = await ai(prompt);
  if (!d.slug || !d.articles) throw new Error('Invalid AI article structure');
  d.slug = slugify(d.slug);
  d.createdAt = new Date().toISOString();
  await writeFile(draftPath(chatId), JSON.stringify(d, null, 2), `chore: save Telegram draft ${d.slug}`);
  return d;
}

async function publish(chatId) {
  const f = await readFile(draftPath(chatId));
  const d = JSON.parse(f.content);
  for (const lang of LANGS) {
    const a = d.articles[lang];
    if (!a) throw new Error(`Missing ${lang} article`);
    await writeFile(`src/content/blog/${lang}/${d.slug}.md`, markdown(a, d), `feat: publish blog ${d.slug} ${lang}`);
  }
  await deleteFile(draftPath(chatId), `chore: remove published draft ${d.slug}`);
  return d;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ok: true, service: 'banggai-wonderland-telegram-cms'});
  try {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (secret && req.headers['x-telegram-bot-api-secret-token'] !== secret) return res.status(401).json({ok:false});
    const m = req.body?.message;
    if (!m?.chat?.id) return res.status(200).json({ok:true});
    if (!authorized(m)) { await send(m.chat.id, '⛔ Akses ditolak.'); return res.status(200).json({ok:true}); }
    const text = (m.text || '').trim();
    if (text === '/start' || text === '/help') {
      await send(m.chat.id, '🌴 Banggai Wonderland AI CMS\n\n/newpost <topik> — buat draft 5 bahasa\n/publish — publish draft ke GitHub\n/discard — hapus draft\n/help — bantuan\n\nContoh:\n/newpost 5 alasan mengapa Banggai adalah hidden paradise Indonesia');
    } else if (text.startsWith('/newpost')) {
      const topic = text.replace(/^\/newpost\s*/i, '').trim();
      if (!topic) return send(m.chat.id, 'Format: /newpost <topik artikel>');
      await send(m.chat.id, '✍️ Sedang membuat artikel 5 bahasa...');
      const d = await makeDraft(m.chat.id, topic);
      const titles = LANGS.map(l => `${l.toUpperCase()}: ${d.articles[l].title}`).join('\n');
      await send(m.chat.id, `✅ Draft selesai.\n\nSlug: ${d.slug}\n\n${titles}\n\nKirim /publish untuk menerbitkan.\nKirim /discard untuk membatalkan.`);
    } else if (text === '/publish') {
      await send(m.chat.id, '🚀 Publishing ke GitHub...');
      const d = await publish(m.chat.id);
      await send(m.chat.id, `🎉 Published: ${d.slug}\n\n5 bahasa sudah masuk ke GitHub. Vercel akan deploy perubahan repository.`);
    } else if (text === '/discard') {
      try { await deleteFile(draftPath(m.chat.id), 'chore: discard Telegram draft'); await send(m.chat.id, '🗑️ Draft dihapus.'); }
      catch (e) { if (String(e.message).includes('Not Found')) await send(m.chat.id, 'Tidak ada draft tersimpan.'); else throw e; }
    } else {
      await send(m.chat.id, 'Perintah tidak dikenal. Gunakan /help.');
    }
    return res.status(200).json({ok:true});
  } catch (e) {
    console.error(e);
    try { if (req.body?.message?.chat?.id) await send(req.body.message.chat.id, `❌ ${e.message}`); } catch (_) {}
    return res.status(200).json({ok:false, error:e.message});
  }
}
