const OPENAI_MODEL = 'gpt-5.6-luna';

const LANGUAGES = {
  id: 'Indonesian',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  zh: 'Chinese'
};

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      service: 'Banggai Wonderland CMS'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({
        success: false,
        error: 'Request data tidak ditemukan.'
      });
    }

    const data = JSON.parse(e.postData.contents);

    const accessKey = PropertiesService
      .getScriptProperties()
      .getProperty('CMS_ACCESS_KEY');

    if (!accessKey || data.accessKey !== accessKey) {
      return jsonResponse({
        success: false,
        error: 'Access key tidak valid.'
      });
    }

    if (!data.topic) {
      return jsonResponse({
        success: false,
        error: 'Topic artikel wajib diisi.'
      });
    }

    const result = generateArticles(data);

    return jsonResponse({
      success: true,
      message: 'Artikel berhasil dibuat.',
      files: result.files
    });

  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.message || String(error)
    });
  }
}


/* =========================
   MAIN GENERATOR
========================= */

function generateArticles(data) {
  const topic = String(data.topic).trim();

  const articles = {};

  Object.keys(LANGUAGES).forEach(function(lang) {
    articles[lang] = generateArticle(
      topic,
      lang,
      LANGUAGES[lang],
      data
    );
  });

  const files = [];

  Object.keys(articles).forEach(function(lang) {
    const article = articles[lang];

    const slug = createSlug(article.title);

    const date = getToday();

    const filename = date + '-' + slug + '.md';

    const path = 'src/content/blog/' + lang + '/' + filename;

    const content = createMarkdown(article);

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

  return {
    files: files
  };
}


/* =========================
   OPENAI
========================= */

function generateArticle(topic, langCode, languageName, data) {

  const apiKey = PropertiesService
    .getScriptProperties()
    .getProperty('OPENAI_API_KEY');

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY belum diset di Script Properties.');
  }

  const prompt = `
You are the professional travel content writer for Banggai Wonderland.

Website:
Banggai Wonderland

Slogan:
Discover hidden paradise of Banggai

Target audience:
International travelers interested in authentic tropical destinations,
nature, beaches, waterfalls, islands, culture and private tours.

Write one high-quality SEO-friendly travel blog article.

TOPIC:
${topic}

LANGUAGE:
Write the complete article in ${languageName}.

IMPORTANT:
- Do not mention that AI was used.
- Do not invent exact prices.
- Do not invent hotels, schedules, distances or facts if they are uncertain.
- Make the article natural and useful for travelers.
- Use a premium travel-agency tone.
- Focus on Banggai, Luwuk and Banggai Islands where relevant.
- Use clear headings.
- Include practical travel information when appropriate.
- Encourage readers to explore Banggai Wonderland naturally.
- Do not overuse keywords.
- The article should feel human-written.

Return ONLY valid JSON.

Required JSON structure:

{
  "title": "SEO-friendly article title",
  "description": "Short article description",
  "seoTitle": "SEO title",
  "seoDescription": "SEO meta description",
  "image": "${data.image || '/images/Poganda-Beach-Banggai-IndonesiaJuara-Trip.webp'}",
  "imageAlt": "Descriptive image alt text",
  "author": "Banggai Wonderland",
  "pubDate": "${getToday()}",
  "tags": ["Banggai", "Indonesia", "Travel"],
  "content": "Full Markdown article"
}

The content field must contain the complete Markdown article.
Do not wrap the JSON in markdown code fences.
`;

  const response = UrlFetchApp.fetch(
    'https://api.openai.com/v1/responses',
    {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + apiKey
      },
      payload: JSON.stringify({
        model: OPENAI_MODEL,
        input: prompt
      }),
      muteHttpExceptions: true
    }
  );

  const status = response.getResponseCode();
  const text = response.getContentText();

  if (status < 200 || status >= 300) {
    throw new Error(
      'OpenAI error (' + status + '): ' + text
    );
  }

  const json = JSON.parse(text);

  const output = extractOpenAIText(json);

  if (!output) {
    throw new Error('OpenAI tidak mengembalikan output teks.');
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
    throw new Error(
      'Output OpenAI bukan JSON valid:\n' + cleaned
    );
  }

  validateArticle(article);

  return article;
}


/* =========================
   OPENAI RESPONSE PARSER
========================= */

function extractOpenAIText(response) {

  if (response.output_text) {
    return response.output_text;
  }

  if (response.output && Array.isArray(response.output)) {

    for (let i = 0; i < response.output.length; i++) {

      const item = response.output[i];

      if (
        item.content &&
        Array.isArray(item.content)
      ) {

        for (let j = 0; j < item.content.length; j++) {

          const content = item.content[j];

          if (
            content.type === 'output_text' &&
            content.text
          ) {
            return content.text;
          }
        }
      }
    }
  }

  return '';
}


/* =========================
   VALIDATION
========================= */

function validateArticle(article) {

  const required = [
    'title',
    'description',
    'image',
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
      throw new Error(
        'Field artikel tidak lengkap: ' + field
      );
    }

  });

}


/* =========================
   MARKDOWN
========================= */

function createMarkdown(article) {

  let markdown = '';

  markdown += '---\n';

  markdown += 'title: "' +
    yamlEscape(article.title) +
    '"\n';

  markdown += 'description: "' +
    yamlEscape(article.description) +
    '"\n';

  if (article.seoTitle) {
    markdown += 'seoTitle: "' +
      yamlEscape(article.seoTitle) +
      '"\n';
  }

  if (article.seoDescription) {
    markdown += 'seoDescription: "' +
      yamlEscape(article.seoDescription) +
      '"\n';
  }

  markdown += 'image: "' +
    yamlEscape(article.image) +
    '"\n';

  if (article.imageAlt) {
    markdown += 'imageAlt: "' +
      yamlEscape(article.imageAlt) +
      '"\n';
  }

  markdown += 'author: "' +
    yamlEscape(article.author) +
    '"\n';

  markdown += 'pubDate: ' +
    article.pubDate +
    '\n';

  if (
    article.tags &&
    Array.isArray(article.tags) &&
    article.tags.length
  ) {

    markdown += 'tags:\n';

    article.tags.forEach(function(tag) {

      markdown += '  - "' +
        yamlEscape(tag) +
        '"\n';

    });
  }

  markdown += '---\n\n';

  markdown += article.content;

  return markdown;
}


/* =========================
   GITHUB
========================= */

function githubCreateFile(path, content, message) {

  const properties =
    PropertiesService.getScriptProperties();

  const token =
    properties.getProperty('GITHUB_TOKEN');

  const owner =
    properties.getProperty('GITHUB_OWNER');

  const repo =
    properties.getProperty('GITHUB_REPO');

  const branch =
    properties.getProperty('GITHUB_BRANCH') || 'main';

  if (!token) {
    throw new Error(
      'GITHUB_TOKEN belum diset.'
    );
  }

  if (!owner || !repo) {
    throw new Error(
      'GITHUB_OWNER atau GITHUB_REPO belum diset.'
    );
  }

  const url =
    'https://api.github.com/repos/' +
    owner +
    '/' +
    repo +
    '/contents/' +
    path;

  const payload = {
    message: message,
    content: Utilities.base64Encode(
      Utilities.newBlob(content).getBytes()
    ),
    branch: branch
  };

  const response = UrlFetchApp.fetch(
    url,
    {
      method: 'put',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    }
  );

  const status = response.getResponseCode();

  if (status < 200 || status >= 300) {

    throw new Error(
      'GitHub error (' +
      status +
      '): ' +
      response.getContentText()
    );

  }

  return JSON.parse(
    response.getContentText()
  );
}


/* =========================
   HELPERS
========================= */

function createSlug(text) {

  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);

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
    .createTextOutput(
      JSON.stringify(data)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );

}
