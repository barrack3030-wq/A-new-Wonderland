// Explicit routing for the Manual Article workflow.
// This overrides the legacy translateSingleArticle implementation in Code.gs
// without touching the existing Bulk Article/OpenAI workflow.

var translateSingleArticle = function(data){
  const lang=String(data.language||'').trim().toLowerCase();
  if(!MANUAL_TARGET_LANGUAGES[lang])throw new Error('Bahasa manual tidak didukung. Gunakan en, zh, fr, atau de.');

  const title=String(data.title||'').trim();
  const description=String(data.description||'').trim();
  const content=String(data.content||'').trim();
  if(!title)throw new Error('Judul artikel sumber wajib diisi.');
  if(!content)throw new Error('Isi artikel sumber wajib diisi.');
  if(content.length<300)throw new Error('Isi artikel terlalu pendek. Minimal 300 karakter.');

  const image=data.image&&data.image.url?data.image:{url:DEFAULT_IMAGE,source:'',alt:'Banggai destination in Indonesia'};
  const source={
    title:title,
    description:description||createPreview(content),
    seoTitle:String(data.seoTitle||title),
    seoDescription:String(data.seoDescription||description||createPreview(content)),
    imageAlt:String(data.imageAlt||image.alt||''),
    tags:normalizeTags(data.tags),
    content:content
  };

  const translated=manualGeminiTranslate(source,MANUAL_TARGET_LANGUAGES[lang],lang);
  return {
    title:translated.title||title,
    description:translated.description||source.description,
    seoTitle:translated.seoTitle||translated.title||title,
    seoDescription:translated.seoDescription||translated.description||source.seoDescription,
    image:image.url||DEFAULT_IMAGE,
    imageAlt:translated.imageAlt||source.imageAlt,
    imageSource:String(image.source||''),
    author:'Banggai Wonderland',
    pubDate:normalizeDate(data.pubDate||getToday()),
    tags:translated.tags.length?translated.tags:source.tags,
    content:translated.content,
    preview:createPreview(translated.content),
    language:lang
  };
};
