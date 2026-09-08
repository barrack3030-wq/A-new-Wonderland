const TELEGRAM = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const OPENAI = 'https://api.openai.com/v1/responses';
const LANGS = ['id', 'en', 'es', 'fr', 'zh'];
const IMAGE = '/images/Poganda-Beach-Banggai-IndonesiaJuara-Trip.webp';
const STATE = '.telegram-cms-state.json';

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

async function tg(method, body = {}) {
  const response = await fetch(`${TELEGRAM}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!data.ok) throw new Error(`Telegram: ${data.description || 'request failed'}`);
  return data.result;
}

async function openai(prompt) {
  const response = await fetch(OPENAI, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${required('OPENAI_API_KEY')}`
    },
    body: JSON.stringify({
      model: required('OPENAI_MODEL'),
      input: prompt,
      text: { format: { type: 'json_object' } }
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`OpenAI: ${data.error?.message || 'request failed'}`);
  const text = data.output_text || data.output?.flatMap(x => x.content || []).map(x => x.text || '').join('');
  if (!text) throw new Error('OpenAI returned no text');
  return JSON.parse(text);
}

const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80);
const yaml = (s) => `'${String(s ?? '').replace(/'/g, "''")}'`;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function loadState() {
  try { return JSON.parse(await (await import('node:fs/promises')).readFile(STATE, 'utf8')); }
  catch { return { offset: 0, drafts: {} }; }
}

async function saveState(state) {
  const fs = await import('node:fs/promises');
  await fs.writeFile(STATE, JSON.stringify(state, null, 2) + '\n');
}

function authorized(message) {
  const allowed = process.env.TELEGRAM_ALLOWED_USER_ID;
  return !allowed || String(message.from?.id) === String(allowed);
}

function markdown(article, draft) {
  const tags = (article.tags || []).map(tag => `  - ${yaml(tag)}`).join('\n');
  return `---\ntitle: ${yaml(article.title)}\ndescription: ${yaml(article.description)}\nseoTitle: ${yaml(article.seoTitle || article.title)}\nseoDescription: ${yaml(article.seoDescription || article.description)}\nimage: ${draft.image || IMAGE}\nimageAlt: ${yaml(draft.imageAlt || article.title)}\nauthor: ${yaml(draft.author || 'aji')}\npubDate: ${draft.pubDate}\ntags:\n${tags}\n---\n\n${String(article.body).trim()}\n`;
}

async function createDraft(chatId, topic) {
  const prompt = `You are the editorial AI for Banggai Wonderland, a premium international travel website about Luwuk and Banggai, Indonesia.

Create one professional, human-sounding, SEO-friendly destination article about: ${topic}

Generate five semantically aligned versions: Indonesian (id), English (en), Spanish (es), French (fr), and Chinese (zh). Each version should read naturally for its audience, not like a literal machine translation. Focus on useful travel information and genuine destination appeal. Do not invent exact prices, opening hours, schedules, permits, statistics, or uncertain facts. Avoid generic AI filler and exaggerated claims. Use Markdown headings in the body. Do not include YAML frontmatter in the body. Use this existing shared featured image for every language: ${IMAGE}. Do not invent other image paths.

Return JSON only with exactly this structure:
{"slug":"english-kebab-case","image":"${IMAGE}","imageAlt":"shared image alt text","author":"aji","pubDate":"${new Date().toISOString()}","articles":{"id":{"title":"","description":"","seoTitle":"","seoDescription":"","tags":[],"body":""},"en":{"title":"","description":"","seoTitle":"","seoDescription":"","tags":[],"body":""},"es":{"title":"","description":"","seoTitle":"","seoDescription":"","tags":[],"body":""},"fr":{"title":"","description":"","seoTitle":"","seoDescription":"","tags":[],"body":""},"zh":{"title":"","description":"","seoTitle":"","seoDescription":"","tags":[],"body":""}}}`;
  const draft = await openai(prompt);
  if (!draft.articles || !LANGS.every(lang => draft.articles[lang])) throw new Error('Invalid multilingual article structure');
  draft.slug = slugify(draft.slug || draft.articles.en.title);
  draft.image = IMAGE;
  draft.pubDate = new Date().toISOString();
  draft.author = 'aji';
  return draft;
}

async function handleMessage(message, state) {
  const chatId = String(message.chat.id);
  const text = String(message.text || '').trim();
  if (!authorized(message)) {
    await tg('sendMessage', { chat_id: chatId, text: '⛔ Akses ditolak.' });
    return;
  }

  if (text === '/start' || text === '/help') {
    await tg('sendMessage', { chat_id: chatId, text: '🌴 Banggai Wonderland AI CMS\n\n/id — lihat Chat ID dan User ID\n/newpost <topik> — buat draft 5 bahasa\n/publish — publish draft ke GitHub\n/discard — hapus draft\n/help — bantuan' });
    return;
  }

  if (text === '/id' || text === '/whoami') {
    await tg('sendMessage', { chat_id: chatId, text: `Chat ID: ${message.chat.id}\nUser ID: ${message.from?.id ?? '-'}\nUsername: @${message.from?.username ?? '-'}` });
    return;
  }

  if (text.startsWith('/newpost')) {
    const topic = text.replace(/^\/newpost\s*/i, '').trim();
    if (!topic) {
      await tg('sendMessage', { chat_id: chatId, text: 'Format: /newpost <topik artikel>' });
      return;
    }
    await tg('sendMessage', { chat_id: chatId, text: '✍️ Membuat artikel 5 bahasa dengan AI...' });
    const draft = await createDraft(chatId, topic);
    state.drafts[chatId] = draft;
    await tg('sendMessage', { chat_id: chatId, text: `✅ Draft selesai.\n\nSlug: ${draft.slug}\nID: ${draft.articles.id.title}\nEN: ${draft.articles.en.title}\nES: ${draft.articles.es.title}\nFR: ${draft.articles.fr.title}\nZH: ${draft.articles.zh.title}\n\nKirim /publish untuk menerbitkan atau /discard untuk membatalkan.` });
    return;
  }

  if (text === '/discard') {
    if (state.drafts[chatId]) {
      delete state.drafts[chatId];
      await tg('sendMessage', { chat_id: chatId, text: '🗑️ Draft dibatalkan.' });
    } else {
      await tg('sendMessage', { chat_id: chatId, text: 'Tidak ada draft tersimpan.' });
    }
    return;
  }

  if (text === '/publish') {
    const draft = state.drafts[chatId];
    if (!draft) {
      await tg('sendMessage', { chat_id: chatId, text: 'Tidak ada draft. Buat dulu dengan /newpost <topik>.' });
      return;
    }
    await tg('sendMessage', { chat_id: chatId, text: '🚀 Menulis 5 artikel ke GitHub...' });
    const fs = await import('node:fs/promises');
    for (const lang of LANGS) {
      const path = `src/content/blog/${lang}/${draft.slug}.md`;
      await fs.mkdir(path.split('/').slice(0, -1).join('/'), { recursive: true });
      await fs.writeFile(path, markdown(draft.articles[lang], draft));
    }
    delete state.drafts[chatId];
    await tg('sendMessage', { chat_id: chatId, text: `🎉 Published: ${draft.slug}\n\n5 bahasa sudah ditulis ke repository. GitHub Actions akan menyimpan perubahan dan Vercel akan melakukan deployment.` });
    return;
  }

  await tg('sendMessage', { chat_id: chatId, text: 'Perintah tidak dikenal. Gunakan /help.' });
}

async function main() {
  required('TELEGRAM_BOT_TOKEN');
  const state = await loadState();
  const updates = await tg('getUpdates', { offset: Number(state.offset || 0), timeout: 0, allowed_updates: ['message'] });
  for (const update of updates) {
    state.offset = update.update_id + 1;
    if (update.message) {
      try { await handleMessage(update.message, state); }
      catch (error) {
        console.error(error);
        try { await tg('sendMessage', { chat_id: update.message.chat.id, text: `❌ ${error.message}` }); } catch {}
      }
    }
    await sleep(200);
  }
  await saveState(state);
}

main().catch(error => { console.error(error); process.exit(1); });
