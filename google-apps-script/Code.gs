const GEMINI_MODEL='gemini-3.6-flash';
const GEMINI_FALLBACK_MODEL='gemini-3.5-flash-lite';
const GEMINI_URL_BASE='https://generativelanguage.googleapis.com/v1beta/models/';
const GEMINI_URL=GEMINI_URL_BASE+GEMINI_MODEL+':generateContent';
const WIKIMEDIA_API='https://commons.wikimedia.org/w/api.php';
const DEFAULT_IMAGE='/images/Poganda-Beach-Banggai-IndonesiaJuara-Trip.webp';
const LANGUAGES={id:'Indonesian',en:'English',es:'Spanish',fr:'French',zh:'Chinese'};
const TARGET_LANGUAGES={en:'English',es:'Spanish',fr:'French',zh:'Chinese'};
const MAX_RETRIES=4;
const BATCH_SIZE=2;

function doGet(){return jsonResponse({ok:true,service:'Banggai Wonderland CMS',version:'7.0-manual-article-translator'});}

function doPost(e){
  try{
    if(!e||!e.postData||!e.postData.contents)throw new Error('Request data tidak ditemukan.');
    const data=JSON.parse(e.postData.contents);
    checkAccessKey(data.accessKey);
    if(data.action==='searchImage')return jsonResponse({ok:true,image:findRelevantImage(String(data.topic||''))});
    if(data.action==='uploadImage')return jsonResponse({ok:true,image:uploadImage(data)});
    if(data.action==='translate'){
      return jsonResponse({ok:true,articles:translateArticle(data)});
    }
    if(data.action==='publish'){
      if(!data.articles||typeof data.articles!=='object')throw new Error('Data artikel tidak ditemukan.');
      const result=publishArticles(data.articles);
      return jsonResponse({ok:true,message:'5 versi artikel berhasil dipublish ke GitHub.',files:result.files});
    }
    throw new Error('Action tidak dikenal.');
  }catch(error){
    return jsonResponse({ok:false,error:error&&error.message?error.message:String(error)});
  }
}

function checkAccessKey(value){
  const expected=PropertiesService.getScriptProperties().getProperty('CMS_ACCESS_KEY');
  if(!expected)throw new Error('CMS_ACCESS_KEY belum diset di Script Properties.');
  if(!value||value!==expected)throw new Error('Access key tidak valid.');
}

function getGeminiConfig(){
  const key=PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if(!key)throw new Error('GEMINI_API_KEY belum diset di Script Properties.');
  return {provider:'gemini',key:key,model:GEMINI_MODEL,url:GEMINI_URL,fallbackModel:GEMINI_FALLBACK_MODEL};
}

function uploadImage(data){
  let blob,originalName='blog-image.jpg',source='';
  if(data.dataUrl){
    const match=String(data.dataUrl).match(/^data:([^;]+);base64,(.+)$/s);
    if(!match)throw new Error('Format upload foto tidak valid.');
    const mime=match[1].toLowerCase();
    if(['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'].indexOf(mime)<0)throw new Error('Format foto harus JPG, PNG, WEBP, GIF atau SVG.');
    const bytes=Utilities.base64Decode(match[2]);
    if(bytes.length>8*1024*1024)throw new Error('Ukuran foto maksimal 8 MB.');
    originalName=String(data.fileName||originalName);
    blob=Utilities.newBlob(bytes,mime,originalName);
  }else if(data.imageUrl){
    source=String(data.imageUrl).trim();
    if(!/^https?:\/\//i.test(source))throw new Error('Link foto harus dimulai dengan http:// atau https://.');
    const r=UrlFetchApp.fetch(source,{method:'get',followRedirects:true,muteHttpExceptions:true});
    if(r.getResponseCode()<200||r.getResponseCode()>=300)throw new Error('Tidak dapat mengambil foto dari link ('+r.getResponseCode()+').');
    blob=r.getBlob();
    if(blob.getBytes().length>8*1024*1024)throw new Error('Foto dari link berukuran lebih dari 8 MB.');
    if(String(blob.getContentType()||'').toLowerCase().indexOf('image/')!==0)throw new Error('Link tersebut tidak mengarah ke file gambar.');
    originalName=String(blob.getName()||originalName);
  }else throw new Error('Pilih foto atau masukkan link foto.');
  const mime=String(blob.getContentType()||'image/jpeg').toLowerCase();
  const ext=extensionForMime(mime,originalName);
  const base=createSlug(originalName.replace(/\.[^.]+$/,''))||'blog-image';
  const fileName=base+'-'+Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'Asia/Makassar','yyyyMMddHHmmss')+'.'+ext;
  const path='public/images/blog/'+fileName;
  githubCreateBinaryFile(path,blob.getBytes(),'CMS: Add blog image '+fileName);
  return {url:'/images/blog/'+fileName,source:source,name:fileName,path:path};
}

function extensionForMime(mime,name){
  if(mime==='image/jpeg')return'jpg';
  if(mime==='image/png')return'png';
  if(mime==='image/webp')return'webp';
  if(mime==='image/gif')return'gif';
  if(mime==='image/svg+xml')return'svg';
  const m=String(name||'').toLowerCase().match(/\.(jpg|jpeg|png|webp|gif|svg)$/);
  return m?(m[1]==='jpeg'?'jpg':m[1]):'jpg';
}

function translateArticle(data){
  const title=String(data.title||'').trim();
  const description=String(data.description||'').trim();
  const content=String(data.content||'').trim();
  if(!title)throw new Error('Judul artikel wajib diisi.');
  if(!content)throw new Error('Isi artikel wajib diisi.');
  if(content.length<300)throw new Error('Isi artikel terlalu pendek. Pastikan artikel lengkap sudah ditempel.');
  const image=data.image&&data.image.url?data.image:{url:DEFAULT_IMAGE,source:'',alt:'Banggai destination in Indonesia'};
  const pubDate=normalizeDate(data.pubDate||getToday());
  const cfg=getGeminiConfig();
  const articles={id:{
    title:title,
    description:description||createPreview(content),
    seoTitle:String(data.seoTitle||title),
    seoDescription:String(data.seoDescription||description||createPreview(content)),
    image:image.url||DEFAULT_IMAGE,
    imageAlt:String(data.imageAlt||image.alt||''),
    imageSource:String(image.source||''),
    author:String(data.author||'Banggai Wonderland'),
    pubDate:pubDate,
    tags:normalizeTags(data.tags),
    content:content,
    preview:createPreview(content)
  }};
  const langs=Object.keys(TARGET_LANGUAGES);
  for(let start=0;start<langs.length;start+=BATCH_SIZE){
    const batch=langs.slice(start,start+BATCH_SIZE);
    const requests=batch.map(function(lang){return translatorRequest(cfg,articles.id,TARGET_LANGUAGES[lang]);});
    const responses=UrlFetchApp.fetchAll(requests);
    responses.forEach(function(response,index){
      const lang=batch[index],status=response.getResponseCode(),raw=response.getContentText();
      let dataOut;
      if(isTransientStatus(status)){
        const retry=aiRequestResilient(cfg,buildTranslationPayload(cfg,articles.id,TARGET_LANGUAGES[lang]),'Translate ['+lang+']');
        dataOut=retry.data;
      }else{
        if(status<200||status>=300)throw new Error('Gemini error ['+lang+'] ('+status+'): '+raw);
        try{dataOut=JSON.parse(raw);}catch(e){throw new Error('Respons AI tidak valid untuk '+lang+'.');}
      }
      const translated=parseTranslationResponse(dataOut,lang);
      articles[lang]={
        title:translated.title||articles.id.title,
        description:translated.description||articles.id.description,
        seoTitle:translated.seoTitle||translated.title||articles.id.title,
        seoDescription:translated.seoDescription||translated.description||articles.id.description,
        image:articles.id.image,
        imageAlt:translated.imageAlt||articles.id.imageAlt,
        imageSource:articles.id.imageSource,
        author:'Banggai Wonderland',
        pubDate:articles.id.pubDate,
        tags:translated.tags.length?translated.tags:articles.id.tags,
        content:translated.content,
        preview:createPreview(translated.content)
      };
    });
    if(start+batch.length<langs.length)Utilities.sleep(300);
  }
  return articles;
}

function normalizeTags(tags){
  if(Array.isArray(tags)&&tags.length)return tags.map(String).filter(function(v){return v.trim();}).slice(0,12);
  if(typeof tags==='string'&&tags.trim())return tags.split(',').map(function(v){return v.trim();}).filter(String).slice(0,12);
  return ['Banggai','Indonesia','Travel'];
}

function translatorRequest(cfg,source,targetLanguage){
  const payload=buildTranslationPayload(cfg,source,targetLanguage);
  let url=cfg.url+'?key='+encodeURIComponent(cfg.key);
  return {url:url,method:'post',contentType:'application/json',headers:{},payload:JSON.stringify(payload),muteHttpExceptions:true};
}

function buildTranslationPayload(cfg,source,targetLanguage){
  const prompt=buildTranslationPrompt(source,targetLanguage);
  return {contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0.2,responseMimeType:'application/json'}};
}

function buildTranslationPrompt(source,targetLanguage){
  return `You are the professional translator for Banggai Wonderland, a premium travel agency in Banggai, Indonesia.

TASK:
Translate the supplied Indonesian travel article into ${targetLanguage}.

STRICT RULES:
- You are ONLY a translator. Do not rewrite, expand, shorten, fact-check, research, or creatively reinterpret the article.
- Preserve every factual claim, meaning, paragraph structure, Markdown heading structure, bullet list, numbered list, table, bold/italic emphasis, link URL, image Markdown, and important formatting.
- Do not add facts, places, prices, distances, schedules, names, statistics, recommendations, citations, or explanations that are not present in the source.
- Do not remove useful information.
- Keep proper nouns such as Banggai, Luwuk, Paisupok, Pulo Dua, Kamumu, Piala, Banggai Laut, and Banggai Kepulauan unchanged unless a standard local-language form is clearly appropriate.
- Translate titles, descriptions, SEO metadata, tags, headings, and body naturally for the target language.
- Maintain a premium, natural travel-editorial tone.
- Preserve Markdown exactly as much as possible. Never return HTML.

SOURCE ARTICLE:
TITLE:
${source.title}

DESCRIPTION:
${source.description}

SEO TITLE:
${source.seoTitle}

SEO DESCRIPTION:
${source.seoDescription}

IMAGE ALT:
${source.imageAlt}

TAGS:
${source.tags.join(' | ')}

CONTENT:
${source.content}

RETURN ONLY VALID JSON IN THIS EXACT SHAPE:
{"title":"...","description":"...","seoTitle":"...","seoDescription":"...","imageAlt":"...","tags":["..."],"content":"..."}`;
}

function parseTranslationResponse(response,lang){
  const output=extractAIText(response);
  if(!output)throw new Error('AI tidak mengembalikan hasil terjemahan untuk '+lang+'.');
  let parsed;
  try{parsed=JSON.parse(cleanJsonOutput(output));}catch(e){throw new Error('Hasil terjemahan bukan JSON valid untuk '+lang+'.');}
  if(!parsed.content||String(parsed.content).trim().length<100)throw new Error('Isi terjemahan '+lang+' tidak lengkap.');
  return {
    title:String(parsed.title||''),
    description:String(parsed.description||''),
    seoTitle:String(parsed.seoTitle||''),
    seoDescription:String(parsed.seoDescription||''),
    imageAlt:String(parsed.imageAlt||''),
    tags:normalizeTags(parsed.tags),
    content:String(parsed.content).trim()
  };
}

function aiRequestResilient(cfg,payload,label){
  let lastRaw='',lastStatus=0;
  for(let attempt=1;attempt<=MAX_RETRIES;attempt++){
    const result=rawAiFetch(cfg,payload);
    if(result.status>=200&&result.status<300){
      let data;try{data=JSON.parse(result.raw);}catch(e){throw new Error(label+': Respons AI tidak valid.');}
      return {data:data,status:result.status};
    }
    lastRaw=result.raw;lastStatus=result.status;
    if(!isTransientStatus(result.status)||attempt===MAX_RETRIES)break;
    const delay=Math.min(30000,Math.pow(2,attempt-1)*1200+Math.floor(Math.random()*800));
    Utilities.sleep(delay);
  }
  const fallback={provider:'gemini',key:cfg.key,model:GEMINI_FALLBACK_MODEL,url:GEMINI_URL_BASE+GEMINI_FALLBACK_MODEL+':generateContent',fallbackModel:''};
  for(let attempt=1;attempt<=MAX_RETRIES;attempt++){
    const result=rawAiFetch(fallback,payload);
    if(result.status>=200&&result.status<300){
      let data;try{data=JSON.parse(result.raw);}catch(e){throw new Error(label+': Respons AI fallback tidak valid.');}
      return {data:data,status:result.status};
    }
    lastRaw=result.raw;lastStatus=result.status;
    if(!isTransientStatus(result.status)||attempt===MAX_RETRIES)break;
    const delay=Math.min(30000,Math.pow(2,attempt-1)*1200+Math.floor(Math.random()*800));
    Utilities.sleep(delay);
  }
  throw new Error(label+' error ('+lastStatus+'): '+lastRaw);
}

function rawAiFetch(cfg,payload){
  let url=cfg.url;
  const options={method:'post',contentType:'application/json',headers:{},payload:JSON.stringify(payload),muteHttpExceptions:true};
  if(cfg.provider==='gemini')url+='?key='+encodeURIComponent(cfg.key);
  const r=UrlFetchApp.fetch(url,options);
  return {status:r.getResponseCode(),raw:r.getContentText()};
}

function isTransientStatus(status){return [408,429,500,502,503,504].indexOf(Number(status))!==-1;}

function findRelevantImage(topic){
  const text=String(topic||'').trim(),lower=text.toLowerCase(),queries=[];
  if(lower.indexOf('mbuang')!==-1){queries.push('Mbuang-Mbuang Banggai Laut');queries.push('Mbuang Mbuang Banggai');}
  if(lower.indexOf('paisupok')!==-1)queries.push('Paisupok Lake Banggai');
  if(lower.indexOf('poganda')!==-1)queries.push('Poganda Beach Banggai');
  if(lower.indexOf('pulo dua')!==-1)queries.push('Pulo Dua Banggai');
  if(lower.indexOf('kamumu')!==-1)queries.push('Kamumu Waterfall Banggai');
  if(lower.indexOf('piala')!==-1)queries.push('Piala Waterfall Luwuk Banggai');
  queries.push(text+' Banggai Indonesia');
  for(let i=0;i<queries.length;i++){const r=searchWikimediaImages(queries[i]);if(r)return r;}
  return {url:DEFAULT_IMAGE,alt:'Banggai tropical destination in Indonesia',source:''};
}

function searchWikimediaImages(query){
  const params=['action=query','format=json','generator=search','gsrnamespace=6','gsrlimit=10','gsrsearch='+encodeURIComponent(query),'prop=imageinfo','iiprop=url|mime|size|extmetadata','iiurlwidth=1600','origin=*'].join('&');
  let r;try{r=UrlFetchApp.fetch(WIKIMEDIA_API+'?'+params,{method:'get',muteHttpExceptions:true,headers:{'User-Agent':'BanggaiWonderlandCMS/7.0'}});}catch(e){return null;}
  if(r.getResponseCode()<200||r.getResponseCode()>=300)return null;
  let data;try{data=JSON.parse(r.getContentText());}catch(e){return null;}
  const pages=data.query&&data.query.pages?Object.keys(data.query.pages).map(function(k){return data.query.pages[k];}):[];
  const normalized=normalizeSearchText(query),words=normalized.split(' ').filter(function(w){return w.length>=4;}),best={value:null,score:-1};
  pages.forEach(function(page){
    const info=page.imageinfo&&page.imageinfo[0];
    if(!info||!info.url)return;
    const mime=String(info.mime||'').toLowerCase();
    if(mime==='image/svg+xml'||mime.indexOf('image/')!==0)return;
    const title=normalizeSearchText(page.title||'');
    let score=0;
    words.forEach(function(w){if(title.indexOf(w)!==-1)score+=5;});
    if(title.indexOf('banggai')!==-1)score+=5;
    if(info.width&&info.height&&Number(info.width)*Number(info.height)>=1000000)score+=3;
    if(score>best.score){const meta=info.extmetadata||{};best.score=score;best.value={url:info.thumburl||info.url,alt:meta.ImageDescription&&meta.ImageDescription.value?stripHtml(meta.ImageDescription.value):String(page.title||'Banggai destination'),source:info.descriptionurl||''};}
  });
  return best.value;
}

function normalizeSearchText(v){return String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function stripHtml(v){return String(v||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();}
function extractAIText(response){
  if(response&&response.output_text)return response.output_text;
  if(response&&Array.isArray(response.output))for(let i=0;i<response.output.length;i++){
    const item=response.output[i];
    if(!item.content)continue;
    for(let j=0;j<item.content.length;j++)if(item.content[j].type==='output_text'&&item.content[j].text)return item.content[j].text;
  }
  if(response&&Array.isArray(response.candidates)&&response.candidates[0]){
    const parts=response.candidates[0].content&&response.candidates[0].content.parts||[];
    for(let i=0;i<parts.length;i++)if(parts[i].text)return parts[i].text;
  }
  if(response&&response.choices&&response.choices[0]&&response.choices[0].message&&response.choices[0].message.content)return response.choices[0].message.content;
  return '';
}

function cleanJsonOutput(v){return String(v||'').replace(/^\s*```json\s*/i,'').replace(/^\s*```\s*/i,'').replace(/\s*```\s*$/i,'').trim();}
function createPreview(content){return String(content||'').replace(/^#{1,6}\s+/gm,'').replace(/[*_`>]/g,'').replace(/\[([^\]]+)\]\([^\)]+\)/g,'$1').replace(/\s+/g,' ').trim().substring(0,420);}

function publishArticles(articles){
  const files=[],first=articles.id;
  if(!first||!first.title||!first.content)throw new Error('Artikel Bahasa Indonesia tidak ditemukan.');
  const translationKey=getToday()+'-'+createSlug(first.title).substring(0,70);
  Object.keys(LANGUAGES).forEach(function(lang){
    const article=articles[lang];
    if(!article||!article.title||!article.content)throw new Error('Artikel bahasa '+lang+' tidak lengkap.');
    const slug=createSlug(article.title);
    if(!slug)throw new Error('Slug kosong untuk '+lang+'.');
    const path='src/content/blog/'+lang+'/'+article.pubDate+'-'+slug+'.md';
    githubCreateFile(path,createMarkdown(article,translationKey),'CMS: Add translated manual blog article ['+lang+'] '+article.title);
    files.push({language:lang,path:path,title:article.title});
  });
  return {files:files};
}

function createMarkdown(article,translationKey){
  let m='---\n';
  m+='title: "'+yamlEscape(article.title)+'"\n';
  m+='description: "'+yamlEscape(article.description)+'"\n';
  if(article.seoTitle)m+='seoTitle: "'+yamlEscape(article.seoTitle)+'"\n';
  if(article.seoDescription)m+='seoDescription: "'+yamlEscape(article.seoDescription)+'"\n';
  m+='image: "'+yamlEscape(article.image||DEFAULT_IMAGE)+'"\n';
  if(article.imageAlt)m+='imageAlt: "'+yamlEscape(article.imageAlt)+'"\n';
  if(article.imageSource)m+='imageSource: "'+yamlEscape(article.imageSource)+'"\n';
  m+='author: "'+yamlEscape(article.author||'Banggai Wonderland')+'"\n';
  m+='pubDate: '+normalizeDate(article.pubDate)+'\n';
  m+='translationKey: "'+yamlEscape(translationKey)+'"\n';
  if(Array.isArray(article.tags)&&article.tags.length){
    m+='tags:\n';
    article.tags.forEach(function(tag){m+='  - "'+yamlEscape(tag)+'"\n';});
  }
  return m+'---\n\n'+String(article.content).trim()+'\n';
}

function githubCreateFile(path,content,message){
  const p=PropertiesService.getScriptProperties();
  const token=p.getProperty('GITHUB_TOKEN'),owner=p.getProperty('GITHUB_OWNER'),repo=p.getProperty('GITHUB_REPO'),branch=p.getProperty('GITHUB_BRANCH')||'main';
  if(!token||!owner||!repo)throw new Error('GitHub Script Properties belum lengkap.');
  const url='https://api.github.com/repos/'+owner+'/'+repo+'/contents/'+path;
  const payload={message:message,content:Utilities.base64Encode(Utilities.newBlob(content).getBytes()),branch:branch};
  const r=UrlFetchApp.fetch(url,{method:'put',contentType:'application/json',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},payload:JSON.stringify(payload),muteHttpExceptions:true});
  if(r.getResponseCode()<200||r.getResponseCode()>=300)throw new Error('GitHub error ('+r.getResponseCode()+'): '+r.getContentText());
  return JSON.parse(r.getContentText());
}

function githubCreateBinaryFile(path,bytes,message){
  const p=PropertiesService.getScriptProperties();
  const token=p.getProperty('GITHUB_TOKEN'),owner=p.getProperty('GITHUB_OWNER'),repo=p.getProperty('GITHUB_REPO'),branch=p.getProperty('GITHUB_BRANCH')||'main';
  if(!token||!owner||!repo)throw new Error('GitHub Script Properties belum lengkap.');
  const url='https://api.github.com/repos/'+owner+'/'+repo+'/contents/'+path;
  const payload={message:message,content:Utilities.base64Encode(bytes),branch:branch};
  const r=UrlFetchApp.fetch(url,{method:'put',contentType:'application/json',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},payload:JSON.stringify(payload),muteHttpExceptions:true});
  if(r.getResponseCode()<200||r.getResponseCode()>=300)throw new Error('GitHub image error ('+r.getResponseCode()+'): '+r.getContentText());
  return JSON.parse(r.getContentText());
}

function createSlug(text){return String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').substring(0,100);}
function normalizeDate(v){const t=String(v||'').trim();return /^\d{4}-\d{2}-\d{2}$/.test(t)?t:getToday();}
function getToday(){return Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'Asia/Makassar','yyyy-MM-dd');}
function yamlEscape(v){return String(v).replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r?\n/g,' ');}
function jsonResponse(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
