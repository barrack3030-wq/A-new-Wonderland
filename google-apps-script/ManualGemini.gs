const MANUAL_GEMINI_MODEL='gemini-2.5-flash-lite';
const MANUAL_GEMINI_URL='https://generativelanguage.googleapis.com/v1beta/models/'+MANUAL_GEMINI_MODEL+':generateContent';

// Manual workflow override: only Manual Article translation uses Gemini.
// The existing bulk workflow in Code.gs continues to use OpenAI unchanged.
function translateSingleArticle(data){
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
}

function manualGeminiTranslate(source,targetLanguage,lang){
  const key=PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if(!key)throw new Error('GEMINI_API_KEY belum diset di Script Properties.');

  const protectedSource=protectManualMarkdown(source.content);
  const prompt=buildManualGeminiPrompt(source,targetLanguage,protectedSource);
  const payload={
    contents:[{role:'user',parts:[{text:prompt}]}],
    generationConfig:{
      responseMimeType:'application/json',
      responseSchema:{
        type:'OBJECT',
        properties:{
          title:{type:'STRING'},
          description:{type:'STRING'},
          seoTitle:{type:'STRING'},
          seoDescription:{type:'STRING'},
          imageAlt:{type:'STRING'},
          tags:{type:'ARRAY',items:{type:'STRING'}},
          content:{type:'STRING'}
        },
        required:['title','description','seoTitle','seoDescription','imageAlt','tags','content']
      }
    }
  };

  let last='';
  for(let attempt=1;attempt<=4;attempt++){
    const response=UrlFetchApp.fetch(MANUAL_GEMINI_URL,{
      method:'post',
      contentType:'application/json',
      headers:{'x-goog-api-key':key},
      payload:JSON.stringify(payload),
      muteHttpExceptions:true
    });
    const status=response.getResponseCode();
    const raw=response.getContentText();
    if(status>=200&&status<300){
      let json;
      try{json=JSON.parse(raw);}catch(e){throw new Error('Respons Gemini tidak valid untuk '+lang+'.');}
      const text=extractManualGeminiText(json);
      if(!text)throw new Error('Gemini tidak mengembalikan hasil terjemahan untuk '+lang+'.');
      let parsed;
      try{parsed=JSON.parse(text);}catch(e){throw new Error('Hasil Gemini bukan JSON valid untuk '+lang+'.');}
      const content=restoreManualMarkdown(String(parsed.content||''),protectedSource.tokens);
      if(!content||content.length<100)throw new Error('Isi terjemahan '+lang+' tidak lengkap.');
      if(!manualMarkdownStructureIsSafe(source.content,content))throw new Error('Struktur Markdown terjemahan '+lang+' berubah. Silakan tekan Translate lagi.');
      return{
        title:String(parsed.title||''),
        description:String(parsed.description||''),
        seoTitle:String(parsed.seoTitle||''),
        seoDescription:String(parsed.seoDescription||''),
        imageAlt:String(parsed.imageAlt||''),
        tags:normalizeTags(parsed.tags),
        content:content
      };
    }
    last=raw;
    if(!isTransientStatus(status)||attempt===4)break;
    Utilities.sleep(Math.min(20000,1200*Math.pow(2,attempt-1)));
  }
  throw new Error('Gemini error ('+responseStatusFromRaw(last)+'): '+last);
}

function buildManualGeminiPrompt(source,targetLanguage,protectedSource){
  return 'You are the professional translator for Banggai Wonderland, a premium travel agency in Banggai, Indonesia.\n\n'+
  'TASK:\nTranslate the supplied Indonesian travel article into '+targetLanguage+'.\n\n'+
  'THIS IS A TRANSLATION TASK ONLY. Do not research, rewrite, expand, summarize, fact-check, or invent information.\n\n'+
  'CRITICAL MARKDOWN RULES:\n'+
  '- Preserve the exact Markdown structure of the source.\n'+
  '- Keep every heading level (#, ##, ###, etc.) in the same position.\n'+
  '- Keep every bullet and numbered-list marker in the same position.\n'+
  '- Keep paragraph breaks, blockquotes, tables, bold, italic, inline code, and fenced code blocks.\n'+
  '- Never convert Markdown into HTML.\n'+
  '- Never remove or create Markdown elements.\n'+
  '- NEVER translate or modify placeholder tokens such as §§URL_0§§, §§CODE_0§§, or §§INLINE_0§§. Return them exactly.\n'+
  '- Every URL must remain byte-for-byte identical.\n'+
  '- YouTube URLs must remain byte-for-byte identical.\n'+
  '- Image Markdown syntax must remain intact; translate only the alt text, never the image URL.\n'+
  '- Keep Banggai place names and proper nouns unchanged unless a standard local-language form is clearly appropriate.\n'+
  '- Translate natural-language text, title, description, SEO metadata, tags, and headings.\n'+
  '- Keep a premium, natural travel-editorial tone.\n\n'+
  'SOURCE TITLE:\n'+source.title+'\n\n'+
  'SOURCE DESCRIPTION:\n'+source.description+'\n\n'+
  'SOURCE SEO TITLE:\n'+source.seoTitle+'\n\n'+
  'SOURCE SEO DESCRIPTION:\n'+source.seoDescription+'\n\n'+
  'SOURCE IMAGE ALT:\n'+source.imageAlt+'\n\n'+
  'SOURCE TAGS:\n'+source.tags.join(' | ')+'\n\n'+
  'SOURCE MARKDOWN CONTENT:\n'+protectedSource.text+'\n\n'+
  'Return only JSON matching the requested schema.';
}

function protectManualMarkdown(markdown){
  const tokens=[];
  let text=String(markdown||'');
  const addToken=function(value,type){const token='§§'+type+'_'+tokens.length+'§§';tokens.push({token:token,value:value});return token;};

  // Protect fenced code blocks completely so code/formatting cannot be translated.
  text=text.replace(/```[\s\S]*?```/g,function(m){return addToken(m,'CODE');});
  // Protect inline code.
  text=text.replace(/`[^`\n]+`/g,function(m){return addToken(m,'INLINE');});
  // Protect URLs, including query strings and YouTube links.
  text=text.replace(/https?:\/\/[^\s)\]>]+/gi,function(m){return addToken(m,'URL');});
  return{text:text,tokens:tokens};
}

function restoreManualMarkdown(text,tokens){
  let out=String(text||'');
  (tokens||[]).forEach(function(item){
    const escaped=item.token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    out=out.replace(new RegExp(escaped,'g'),item.value);
  });
  return out.trim();
}

function manualMarkdownStructureIsSafe(source,translated){
  const a=markdownStructureSignature(source),b=markdownStructureSignature(translated);
  return a.headings===b.headings&&a.lists===b.lists&&a.fences===b.fences&&a.tables===b.tables;
}

function markdownStructureSignature(md){
  const lines=String(md||'').split(/\r?\n/),headings=[],lists=[],tables=[],fences=[];
  let inFence=false;
  lines.forEach(function(line){
    if(/^\s*```/.test(line)){inFence=!inFence;fences.push(inFence?'open':'close');return;}
    if(inFence)return;
    const h=line.match(/^\s*(#{1,6})\s+/);if(h)headings.push(h[1].length);
    const l=line.match(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/);if(l)lists.push(l[1].trim().replace(/\d+/g,'N'));
    if(/^\s*\|/.test(line))tables.push('|');
  });
  return{headings:headings.join(','),lists:lists.join(','),fences:fences.join(','),tables:tables.length};
}

function extractManualGeminiText(response){
  const candidates=response&&response.candidates?response.candidates:[];
  for(let i=0;i<candidates.length;i++){
    const parts=candidates[i].content&&candidates[i].content.parts?candidates[i].content.parts:[];
    for(let j=0;j<parts.length;j++)if(parts[j].text)return String(parts[j].text).trim();
  }
  return'';
}

function responseStatusFromRaw(raw){
  const m=String(raw||'').match(/"code"\s*:\s*(\d+)/);return m?m[1]:'unknown';
}
