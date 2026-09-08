const OPENAI_MODEL = 'gpt-5.6-luna';

const LANGUAGES = {
  id: 'Indonesian',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  zh: 'Chinese'
};

const DEFAULT_IMAGE = '/images/Poganda-Beach-Banggai-IndonesiaJuara-Trip.webp';
const WIKIMEDIA_API = 'https://commons.wikimedia.org/w/api.php';

function doGet() {
  return jsonResponse({
    ok: true,
    service: 'Banggai Wonderland CMS'
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ ok: false, error: 'Request data tidak ditemukan.' });
    }

    const data = JSON.parse(e.postData.contents);
    checkAccessKey(data.accessKey);

    if (data.action === 'generate') {
      if (!data.topic || !String(data.topic).trim()) {
        throw new Error('Topic artikel wajib diisi.');
      }

      const articles = generateArticles(String(data.topic).trim());

      return jsonResponse({
        ok: true,
        articles: articles
      });
    }

    if (data.action === 'publish') {
      if (!data.articles || typeof data.articles !== 'object') {
        throw new Error('Data artikel tidak ditemukan.');
      }

      const result = publishArticles(data.articles);

      return jsonResponse({
        ok: true,
        message: '5 versi artikel berhasil dipublish ke GitHub.',
        files: result.files
      });
    }

    throw new Error('Action tidak dikenal. Gunakan generate atau publish.');

  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error && error.message ? error.message : String(error)
    });
  }
}

function checkAccessKey(value) {
  const expected = PropertiesService
    .getScriptProperties()
    .getProperty('CMS_ACCESS_KEY');

  if (!expected) {
    throw new Error('CMS_ACCESS_KEY belum diset di Script Properties.');
  }

  if (!value || value !== expected) {
    throw new Error('Access key tidak valid.');
  }
}

// Generate all five languages in parallel instead of waiting for five
// sequential OpenAI requests. This dramatically reduces the chance that the
// browser request expires while Apps Script is still working.
function generateArticles(topic) {
  const apiKey = PropertiesService
    .getScriptProperties()
    .getProperty('OPENAI_API_KEY');

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY belum diset di Script Properties.');
  }

  const image = findRelevantImage(topic);
  const languageCodes = Object.keys(LANGUAGES);

  const requests = languageCodes.map(function(lang) {
    return {
      url: 'https://api.openai.com/v1/responses',
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + apiKey
      },
      payload: JSON.stringify({
        model: OPENAI_MODEL,
        input: buildPrompt(topic, LANGUAGES[lang], image)
      }),
      muteHttpExceptions: true
    };
  });

  const responses = UrlFetchApp.fetchAll(requests);
  const articles = {};

  responses.forEach(function(response, index) {
    const lang = languageCodes[index];
    const status = response.getResponseCode();
    const raw = response.getContentText();

    if (status < 200 || status >= 300) {
      throw new Error('OpenAI error [' + lang + '] (' + status + '): ' + raw);
    }

    const data = JSON.parse(raw);
    const output = extractOpenAIText(data);

    if (!output) {
      throw new Error('OpenAI tidak mengembalikan output teks untuk bahasa ' + lang + '.');
    }

    const cleaned = output
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let article;

    try {
      article = JSON.parse(cleaned);
    } catch (error) {
      throw new Error('Output OpenAI bukan JSON valid untuk bahasa ' + lang + '.');
    }

    validateArticle(article);

    articles[lang] = {
      title: String(article.title),
      description: String(article.description),
      seoTitle: article.seoTitle ? String(article.seoTitle) : '',
      seoDescription: article.seoDescription ? String(article.seoDescription) : '',
      image: image.url || DEFAULT_IMAGE,
      imageAlt: image.alt || (article.imageAlt ? String(article.imageAlt) : ''),
      imageSource: image.source || '',
      author: article.author ? String(article.author) : 'Banggai Wonderland',
      pubDate: article.pubDate ? String(article.pubDate) : getToday(),
      tags: Array.isArray(article.tags) ? article.tags.map(String) : ['Banggai', 'Indonesia', 'Travel'],
      content: String(article.content),
      preview: createPreview(article.content)
    };
  });

  return articles;
}

function buildPrompt(topic, languageName, image) {
  return `
You are the professional travel content writer for Banggai Wonderland.

Website: Banggai Wonderland
Slogan: Discover hidden paradise of Banggai

Target audience: international travelers interested in authentic tropical destinations, nature, beaches, waterfalls, islands, culture and private tours.

TOPIC:
${topic}

LANGUAGE:
Write the complete article in ${languageName}.

FEATURED IMAGE:
Use this image because it was selected specifically from Wikimedia Commons based on the destination/topic:
${image.url || DEFAULT_IMAGE}

Create a high-quality, natural, SEO-friendly travel article.

Rules:
- Do not mention AI.
- Do not invent exact prices.
- Do not invent facts, schedules, distances or facilities when uncertain.
- Use a premium but natural travel-agency tone.
- Focus on Banggai, Luwuk and Banggai Islands when relevant.
- Use useful H2/H3 headings.
- Include practical travel information when appropriate.
- Avoid keyword stuffing.
- The article must be genuinely useful to travelers.
- The article body must be Markdown.
- Do not use HTML.
- Keep destination names such as Mbuang-Mbuang, Banggai Laut, Luwuk and Banggai unchanged when they are proper place names.

Return ONLY valid JSON with this exact structure:
{
  "title": "SEO-friendly article title",
  "description": "Short article description",
  "seoTitle": "SEO title",
  "seoDescription": "SEO meta description",
  "image": "${image.url || DEFAULT_IMAGE}",
  "imageAlt": "Descriptive image alt text in the article language",
  "author": "Banggai Wonderland",
  "pubDate": "${getToday()}",
  "tags": ["Banggai", "Indonesia", "Travel"],
  "content": "Complete Markdown article"
}

Do not wrap the JSON in markdown code fences.
`;
}

// Search Wikimedia Commons using the actual topic/destination keywords.
// The API returns image URLs and optional scaled thumbnails; this lets the CMS
// choose a real destination image instead of always using one generic photo.
function findRelevantImage(topic) {
  const text = String(topic || '').trim();
  const lower = text.toLowerCase();
  const queries = [];

  if (lower.indexOf('mbuang') !== -1) {
    queries.push('Mbuang-Mbuang Banggai Laut');
    queries.push('Mbuang Mbuang Banggai');
  }

  queries.push(text + ' Banggai Indonesia');

  for (let i = 0; i < queries.length; i++) {
    const result = searchWikimediaImages(queries[i]);
    if (result) return result;
  }

  return {
    url: DEFAULT_IMAGE,
    alt: 'Banggai tropical destination in Indonesia',
    source: ''
  };
}

function searchWikimediaImages(query) {
  const params = [
    'action=query',
    'format=json',
    'generator=search',
    'gsrnamespace=6',
    'gsrlimit=8',
    'gsrsearch=' + encodeURIComponent(query),
    'prop=imageinfo',
    'iiprop=url|mime|size|extmetadata',
    'iiurlwidth=1600',
    'origin=*'
  ].join('&');

  const response = UrlFetchApp.fetch(
    WIKIMEDIA_API + '?' + params,
    {
      method: 'get',
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'BanggaiWonderlandCMS/1.0'
      }
    }
  );

  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    return null;
  }

  let data;
  try {
    data = JSON.parse(response.getContentText());
  } catch (error) {
    return null;
  }

  const pages = data.query && data.query.pages
    ? Object.keys(data.query.pages).map(function(key) { return data.query.pages[key]; })
    : [];

  const normalizedQuery = normalizeSearchText(query);
  const queryWords = normalizedQuery.split(' ').filter(function(word) {
    return word.length >= 4;
  });

  let best = null;
  let bestScore = -1;

  pages.forEach(function(page) {
    const info = page.imageinfo && page.imageinfo[0];
    if (!info || !info.url) return;

    const mime = String(info.mime || '').toLowerCase();
    if (mime === 'image/svg+xml' || mime.indexOf('image/') !== 0) return;

    const title = normalizeSearchText(page.title || '');
    let score = 0;

    queryWords.forEach(function(word) {
      if (title.indexOf(word) !== -1) score += 5;
    });

    if (title.indexOf('mbuang') !== -1 && normalizedQuery.indexOf('mbuang') !== -1) score += 30;
    if (title.indexOf('banggai') !== -1 && normalizedQuery.indexOf('banggai') !== -1) score += 10;
    if (title.indexOf('laut') !== -1 && normalizedQuery.indexOf('laut') !== -1) score += 5;

    if (info.width && info.height) {
      const pixels = Number(info.width) * Number(info.height);
      if (pixels >= 1000000) score += 3;
    }

    if (score > bestScore) {
      bestScore = score;
      const metadata = info.extmetadata || {};
      best = {
        url: info.thumburl || info.url,
        alt: metadata.ImageDescription && metadata.ImageDescription.value
          ? stripHtml(metadata.ImageDescription.value)
          : String(page.title || 'Banggai destination'),
        source: info.descriptionurl || ''
      };
    }
  });

  return best;
}

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractOpenAIText(response) {
  if (response.output_text) {
    return response.output_text;
  }

  if (response.output && Array.isArray(response.output)) {
    for (let i = 0; i < response.output.length; i++) {
      const item = response.output[i];

      if (!item.content || !Array.isArray(item.content)) {
        continue;
      }

      for (let j = 0; j < item.content.length; j++) {
        const content = item.content[j];

        if (content.type === 'output_text' && content.text) {
          return content.text;
        }
      }
    }
  }

  return '';
}

function validateArticle(article) {
  const required = [
    'title',
    'description',
    'author',
    'pubDate',
    'content'
  ];

  required.forEach(function(field) {
    if (
      article[field] === undefined ||
      article[field] === null ||
      String(article[field]).trim() === ''
    ) {
      throw new Error('Field artikel tidak lengkap: ' + field);
    }
  });
}

function createPreview(content) {
  return String(content || '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`>]/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 320);
}

function publishArticles(articles) {
  const files = [];
  const translationKey = createTranslationKey(articles.id || articles.en || articles.es || articles.fr || articles.zh);

  Object.keys(LANGUAGES).forEach(function(lang) {
    const article = articles[lang];

    if (!article || !article.title || !article.content) {
      throw new Error('Artikel bahasa ' + lang + ' tidak lengkap.');
    }

    const slug = createSlug(article.title);
    if (!slug) {
      throw new Error('Judul artikel bahasa ' + lang + ' menghasilkan slug kosong.');
    }

    const path = 'src/content/blog/' + lang + '/' + getToday() + '-' + slug + '.md';
    const content = createMarkdown(article, translationKey);

    githubCreateFile(
      path,
      content,
      'CMS: Add blog article [' + lang + '] ' + article.title
    );

    files.push({
      language: lang,
      path: path,
      title: article.title
    });
  });

  return { files: files };
}

function createTranslationKey(article) {
  const source = article && article.title ? article.title : 'banggai-wonderland-article';
  return getToday() + '-' + createSlug(source).substring(0, 70);
}

function createMarkdown(article, translationKey) {
  let markdown = '---\n';

  markdown += 'title: "' + yamlEscape(article.title) + '"\n';
  markdown += 'description: "' + yamlEscape(article.description) + '"\n';

  if (article.seoTitle) {
    markdown += 'seoTitle: "' + yamlEscape(article.seoTitle) + '"\n';
  }

  if (article.seoDescription) {
    markdown += 'seoDescription: "' + yamlEscape(article.seoDescription) + '"\n';
  }

  markdown += 'image: "' + yamlEscape(article.image || DEFAULT_IMAGE) + '"\n';

  if (article.imageAlt) {
    markdown += 'imageAlt: "' + yamlEscape(article.imageAlt) + '"\n';
  }

  if (article.imageSource) {
    markdown += 'imageSource: "' + yamlEscape(article.imageSource) + '"\n';
  }

  markdown += 'author: "' + yamlEscape(article.author || 'Banggai Wonderland') + '"\n';
  markdown += 'pubDate: ' + normalizeDate(article.pubDate) + '\n';
  markdown += 'translationKey: "' + yamlEscape(translationKey) + '"\n';

  if (Array.isArray(article.tags) && article.tags.length) {
    markdown += 'tags:\n';
    article.tags.forEach(function(tag) {
      markdown += '  - "' + yamlEscape(tag) + '"\n';
    });
  }

  markdown += '---\n\n';
  markdown += String(article.content).trim() + '\n';

  return markdown;
}

function githubCreateFile(path, content, message) {
  const properties = PropertiesService.getScriptProperties();
  const token = properties.getProperty('GITHUB_TOKEN');
  const owner = properties.getProperty('GITHUB_OWNER');
  const repo = properties.getProperty('GITHUB_REPO');
  const branch = properties.getProperty('GITHUB_BRANCH') || 'main';

  if (!token) throw new Error('GITHUB_TOKEN belum diset di Script Properties.');
  if (!owner) throw new Error('GITHUB_OWNER belum diset di Script Properties.');
  if (!repo) throw new Error('GITHUB_REPO belum diset di Script Properties.');

  const url = 'https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + path;

  const payload = {
    message: message,
    content: Utilities.base64Encode(Utilities.newBlob(content).getBytes()),
    branch: branch
  };

  const response = UrlFetchApp.fetch(
    url,
    {
      method: 'put',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    }
  );

  const status = response.getResponseCode();

  if (status < 200 || status >= 300) {
    throw new Error('GitHub error (' + status + '): ' + response.getContentText());
  }

  return JSON.parse(response.getContentText());
}

function createSlug(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

function normalizeDate(value) {
  const text = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }
  return getToday();
}

function getToday() {
  return Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone() || 'Asia/Makassar',
    'yyyy-MM-dd'
  );
}

function yamlEscape(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, ' ');
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
