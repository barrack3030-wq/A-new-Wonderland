const OPENAI_MODEL = 'gpt-5.6-luna';
const WIKIMEDIA_API = 'https://commons.wikimedia.org/w/api.php';
const DEFAULT_IMAGE = '/images/Poganda-Beach-Banggai-IndonesiaJuara-Trip.webp';
const LANGUAGES = { id:'Indonesian', en:'English', es:'Spanish', fr:'French', zh:'Chinese' };
const RESEARCH_CONTEXT_SIZE = 'high';
const MAX_RESEARCH_CHARS = 42000;

function doGet(){ return jsonResponse({ok:true,service:'Banggai Wonderland CMS',version:'2.0-research'}); }

function doPost(e){
  try{
    if(!e || !e.postData || !e.postData.contents) throw new Error('Request data tidak ditemukan.');
    const data=JSON.parse(e.postData.contents);
    checkAccessKey(data.accessKey);
    if(data.action==='searchImage') return jsonResponse({ok:true,image:findRelevantImage(String(data.topic||''))});
    if(data.action==='uploadImage') return jsonResponse({ok:true,image:uploadImage(data)});
    if(data.action==='generate'){
      const topic=String(data.topic||'').trim();
      if(!topic) throw new Error('Topic artikel wajib diisi.');
      return jsonResponse({ok:true,articles:generateArticles(topic,data.image)});
    }
    if(data.action==='publish'){
      if(!data.articles || typeof data.articles!=='object') throw new Error('Data artikel tidak ditemukan.');
      const result=publishArticles(data.articles);
      return jsonResponse({ok:true,message:'5 versi artikel berhasil dipublish ke GitHub.',files:result.files});
    }
    throw new Error('Action tidak dikenal.');
  }catch(error){ return jsonResponse({ok:false,error:error&&error.message?error.message:String(error)}); }
}

function checkAccessKey(value){
  const expected=PropertiesService.getScriptProperties().getProperty('CMS_ACCESS_KEY');
  if(!expected) throw new Error('CMS_ACCESS_KEY belum diset di Script Properties.');
  if(!value || value!==expected) throw new Error('Access key tidak valid.');
}

function uploadImage(data){
  let blob;
  let originalName='blog-image.jpg';
  let source='';
  if(data.dataUrl){
    const match=String(data.dataUrl).match(/^data:([^;]+);base64,(.+)$/s);
    if(!match) throw new Error('Format upload foto tidak valid.');
    const mime=match[1].toLowerCase();
    if(['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'].indexOf(mime)===-1) throw new Error('Format foto harus JPG, PNG, WEBP, GIF atau SVG.');
    const bytes=Utilities.base64Decode(match[2]);
    if(bytes.length>8*1024*1024) throw new Error('Ukuran foto maksimal 8 MB.');
    originalName=String(data.fileName||originalName);
    blob=Utilities.newBlob(bytes,mime,originalName);
  }else if(data.imageUrl){
    source=String(data.imageUrl).trim();
    if(!/^https?:\/\//i.test(source)) throw new Error('Link foto harus dimulai dengan http:// atau https://.');
    const response=UrlFetchApp.fetch(source,{method:'get',followRedirects:true,muteHttpExceptions:true});
    if(response.getResponseCode()<200 || response.getResponseCode()>=300) throw new Error('Tidak dapat mengambil foto dari link ('+response.getResponseCode()+').');
    blob=response.getBlob();
    if(blob.getBytes().length>8*1024*1024) throw new Error('Foto dari link berukuran lebih dari 8 MB.');
    const mime=String(blob.getContentType()||'').toLowerCase();
    if(mime.indexOf('image/')!==0) throw new Error('Link tersebut tidak mengarah ke file gambar.');
    originalName=String(blob.getName()||originalName);
  }else{
    throw new Error('Pilih foto atau masukkan link foto.');
  }
  const mime=String(blob.getContentType()||'image/jpeg').toLowerCase();
  const ext=extensionForMime(mime,originalName);
  const base=createSlug(originalName.replace(/\.[^.]+$/,''))||'blog-image';
  const fileName=base+'-'+Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'Asia/Makassar','yyyyMMddHHmmss')+'.'+ext;
  const path='public/images/blog/'+fileName;
  githubCreateBinaryFile(path,blob.getBytes(),'CMS: Add blog image '+fileName);
  return {url:'/images/blog/'+fileName,source:source||'',name:fileName,path:path};
}

function extensionForMime(mime,name){
  if(mime==='image/jpeg') return 'jpg';
  if(mime==='image/png') return 'png';
  if(mime==='image/webp') return 'webp';
  if(mime==='image/gif') return 'gif';
  if(mime==='image/svg+xml') return 'svg';
  const match=String(name||'').toLowerCase().match(/\.(jpg|jpeg|png|webp|gif|svg)$/);
  return match ? (match[1]==='jpeg'?'jpg':match[1]) : 'jpg';
}

function generateArticles(topic,selectedImage){
  const apiKey=PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if(!apiKey) throw new Error('OPENAI_API_KEY belum diset di Script Properties.');
  const image=selectedImage && selectedImage.url ? selectedImage : findRelevantImage(topic);

  // One deep research pass is shared by all languages so facts remain consistent.
  const research=researchTopic(topic,apiKey);
  const langs=Object.keys(LANGUAGES);
  const requests=langs.map(function(lang){
    return {
      url:'https://api.openai.com/v1/responses',
      method:'post',
      contentType:'application/json',
      headers:{Authorization:'Bearer '+apiKey},
      payload:JSON.stringify({
        model:OPENAI_MODEL,
        input:buildPrompt(topic,LANGUAGES[lang],image,research),
        temperature:0.7
      }),
      muteHttpExceptions:true
    };
  });
  const responses=UrlFetchApp.fetchAll(requests);
  const articles={};
  responses.forEach(function(response,index){
    const lang=langs[index], status=response.getResponseCode(), raw=response.getContentText();
    if(status<200||status>=300) throw new Error('OpenAI error ['+lang+'] ('+status+'): '+raw);
    let data; try{data=JSON.parse(raw);}catch(e){throw new Error('Respons OpenAI tidak valid untuk '+lang+'.');}
    const output=extractOpenAIText(data);
    if(!output) throw new Error('OpenAI tidak mengembalikan output teks untuk '+lang+'.');
    const cleaned=cleanJsonOutput(output);
    let article; try{article=JSON.parse(cleaned);}catch(e){throw new Error('Output OpenAI bukan JSON valid untuk '+lang+'.');}
    validateArticle(article);
    articles[lang]={
      title:String(article.title),
      description:String(article.description),
      seoTitle:article.seoTitle?String(article.seoTitle):'',
      seoDescription:article.seoDescription?String(article.seoDescription):'',
      image:image.url||DEFAULT_IMAGE,
      imageAlt:article.imageAlt?String(article.imageAlt):'',
      imageSource:image.source||'',
      author:article.author?String(article.author):'Banggai Wonderland',
      pubDate:article.pubDate?String(article.pubDate):getToday(),
      tags:Array.isArray(article.tags)?article.tags.map(String):['Banggai','Indonesia','Travel'],
      content:String(article.content),
      preview:createPreview(article.content)
    };
  });
  return articles;
}

function researchTopic(topic,apiKey){
  const response=UrlFetchApp.fetch('https://api.openai.com/v1/responses',{
    method:'post',
    contentType:'application/json',
    headers:{Authorization:'Bearer '+apiKey},
    payload:JSON.stringify({
      model:OPENAI_MODEL,
      tools:[{type:'web_search',search_context_size:RESEARCH_CONTEXT_SIZE}],
      input:buildResearchPrompt(topic),
      temperature:0.2
    }),
    muteHttpExceptions:true
  });
  const status=response.getResponseCode(), raw=response.getContentText();
  if(status<200||status>=300) throw new Error('Web research error ('+status+'): '+raw);
  let data;try{data=JSON.parse(raw);}catch(e){throw new Error('Respons web research tidak valid.');}
  const text=extractOpenAIText(data);
  if(!text) throw new Error('Web research tidak menghasilkan ringkasan.');
  return String(text).substring(0,MAX_RESEARCH_CHARS);
}

function buildResearchPrompt(topic){
  return `You are the research editor for Banggai Wonderland, a premium travel agency focused on Luwuk, Banggai, Banggai Kepulauan, and Banggai Laut, Indonesia.

RESEARCH TOPIC:
${topic}

Perform deep web research before writing anything. Search multiple independent web sources and prioritize:
1) official government / tourism sources,
2) reputable travel publications or established travel guides,
3) local news and local websites,
4) Wikimedia or other reliable reference sources when useful.

Research the exact places, names, locations, access, transport, approximate travel times, activities, safety, local rules, culture/history, and anything else specifically relevant to this topic.

Important rules:
- Cross-check important facts across multiple sources where possible.
- Clearly distinguish verified facts from estimates, opinions, or information that is uncertain.
- Do NOT invent exact prices, opening hours, distances, schedules, facilities, historical claims, or accessibility claims.
- Prefer current information and note when information may change.
- Do not use search-result snippets as if they were verified facts when the underlying page is unavailable.
- Avoid padding the research with generic travel advice unrelated to the topic.

Return a concise but detailed RESEARCH PACK for another writer. Include:
A. Verified facts
B. Practical travel/access information
C. Distinctive experiences and details
D. Safety / etiquette / environmental considerations
E. Conflicting or uncertain information that must be phrased carefully
F. Source list with title + domain + URL for the most useful sources

Do not write the final article. This is a factual research pack only.`;
}

function buildPrompt(topic,language,image,research){
  return `You are the senior editorial writer for Banggai Wonderland, a premium travel agency.

Website: Banggai Wonderland
Slogan: Discover hidden paradise of Banggai

TOPIC:
${topic}

TARGET LANGUAGE:
Write the complete article in ${language}.

FEATURED IMAGE:
${image.url||DEFAULT_IMAGE}

VERIFIED WEB RESEARCH PACK:
${research}

EDITORIAL STANDARD:
Create a genuinely useful, authoritative, immersive long-form travel article based on the research pack above.

The article should normally be around 1,800–2,500+ words when the subject supports that depth. Do not artificially add filler just to reach a word count.

The article should feel like it was written by someone who understands the destination, not like a generic AI travel template.

CONTENT REQUIREMENTS:
- Strong opening that answers the reader's intent and creates desire to explore.
- Give concrete, useful information instead of vague travel language.
- Use a clear H2/H3 hierarchy.
- When the topic contains multiple places, give each important place its own substantial section.
- Explain location, character, what visitors can actually experience, access, practical considerations, and why each place is worth visiting when those facts are available.
- Add a useful quick-facts section or table when appropriate.
- Add practical travel planning information.
- Add a realistic itinerary or suggested way to combine the destination with nearby places when supported by research.
- Include safety, weather, environmental and cultural etiquette where relevant.
- Include a concise FAQ section with useful search-intent questions.
- End with a natural Banggai Wonderland travel-planning CTA, never with exaggerated sales copy.

FACTUALITY:
- Use the research pack as the factual foundation.
- Never invent details simply to make the article longer.
- If sources disagree, explain the uncertainty instead of choosing a made-up answer.
- Never present estimates as exact facts.
- Keep official place names unchanged.
- Do not mention the research process, AI, prompts, or these instructions in the article.

SEO:
- Write naturally for humans first.
- Include the primary search intent in the title, introduction, at least one relevant heading, and body naturally.
- Include semantically related phrases and destination names without keyword stuffing.
- Produce a compelling meta title and meta description.
- Use useful descriptive image alt text.

STYLE:
Premium, warm, specific, confident, informative, immersive, and natural. Avoid repetitive phrases such as “hidden gem”, “breathtaking”, “paradise”, and “for those seeking” unless genuinely appropriate.

MARKDOWN:
Article content must be Markdown only. No HTML. Use real Markdown headings, lists, tables when useful, and short readable paragraphs.

RETURN ONLY VALID JSON:
{"title":"SEO-friendly article title","description":"Short article description","seoTitle":"SEO title","seoDescription":"SEO meta description","image":"${image.url||DEFAULT_IMAGE}","imageAlt":"Descriptive image alt text","author":"Banggai Wonderland","pubDate":"${getToday()}","tags":["Banggai","Indonesia","Travel"],"content":"Complete long-form Markdown article"}

Do not wrap the JSON in markdown fences.`;
}

function findRelevantImage(topic){
  const text=String(topic||'').trim(), lower=text.toLowerCase(), queries=[];
  if(lower.indexOf('mbuang')!==-1){queries.push('Mbuang-Mbuang Banggai Laut');queries.push('Mbuang Mbuang Banggai');}
  if(lower.indexOf('paisupok')!==-1) queries.push('Paisupok Lake Banggai');
  if(lower.indexOf('poganda')!==-1) queries.push('Poganda Beach Banggai');
  if(lower.indexOf('pulo dua')!==-1) queries.push('Pulo Dua Banggai');
  if(lower.indexOf('kamumu')!==-1) queries.push('Kamumu Waterfall Banggai');
  if(lower.indexOf('piala')!==-1) queries.push('Piala Waterfall Luwuk Banggai');
  queries.push(text+' Banggai Indonesia');
  for(let i=0;i<queries.length;i++){const result=searchWikimediaImages(queries[i]);if(result)return result;}
  return {url:DEFAULT_IMAGE,alt:'Banggai tropical destination in Indonesia',source:''};
}

function searchWikimediaImages(query){
  const params=['action=query','format=json','generator=search','gsrnamespace=6','gsrlimit=10','gsrsearch='+encodeURIComponent(query),'prop=imageinfo','iiprop=url|mime|size|extmetadata','iiurlwidth=1600','origin=*'].join('&');
  let response; try{response=UrlFetchApp.fetch(WIKIMEDIA_API+'?'+params,{method:'get',muteHttpExceptions:true,headers:{'User-Agent':'BanggaiWonderlandCMS/2.0'}});}catch(e){return null;}
  if(response.getResponseCode()<200||response.getResponseCode()>=300)return null;
  let data;try{data=JSON.parse(response.getContentText());}catch(e){return null;}
  const pages=data.query&&data.query.pages?Object.keys(data.query.pages).map(function(k){return data.query.pages[k];}):[];
  const normalized=normalizeSearchText(query), words=normalized.split(' ').filter(function(w){return w.length>=4;});
  let best=null,bestScore=-1;
  pages.forEach(function(page){
    const info=page.imageinfo&&page.imageinfo[0]; if(!info||!info.url)return;
    const mime=String(info.mime||'').toLowerCase(); if(mime==='image/svg+xml'||mime.indexOf('image/')!==0)return;
    const title=normalizeSearchText(page.title||''); let score=0;
    words.forEach(function(w){if(title.indexOf(w)!==-1)score+=5;});
    if(title.indexOf('mbuang')!==-1&&normalized.indexOf('mbuang')!==-1)score+=30;
    if(title.indexOf('paisupok')!==-1&&normalized.indexOf('paisupok')!==-1)score+=30;
    if(title.indexOf('poganda')!==-1&&normalized.indexOf('poganda')!==-1)score+=30;
    if(title.indexOf('banggai')!==-1)score+=5;
    if(info.width&&info.height&&Number(info.width)*Number(info.height)>=1000000)score+=3;
    if(score>bestScore){bestScore=score;const meta=info.extmetadata||{};best={url:info.thumburl||info.url,alt:meta.ImageDescription&&meta.ImageDescription.value?stripHtml(meta.ImageDescription.value):String(page.title||'Banggai destination'),source:info.descriptionurl||''};}
  });
  return best;
}

function normalizeSearchText(value){return String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function stripHtml(value){return String(value||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();}
function extractOpenAIText(response){
  if(response.output_text)return response.output_text;
  if(response.output&&Array.isArray(response.output)){
    for(let i=0;i<response.output.length;i++){
      const item=response.output[i];
      if(!item.content)continue;
      for(let j=0;j<item.content.length;j++){
        const c=item.content[j];
        if(c.type==='output_text'&&c.text)return c.text;
      }
    }
  }
  return '';
}
function cleanJsonOutput(output){
  return String(output||'').replace(/^\s*```json\s*/i,'').replace(/^\s*```\s*/i,'').replace(/\s*```\s*$/i,'').trim();
}
function validateArticle(article){
  ['title','description','author','pubDate','content'].forEach(function(field){
    if(article[field]===undefined||article[field]===null||String(article[field]).trim()==='')throw new Error('Field artikel tidak lengkap: '+field);
  });
  if(String(article.content).length<5000)throw new Error('Artikel '+String(article.title||'')+' terlalu pendek. Minimum editorial quality belum terpenuhi.');
}
function createPreview(content){return String(content||'').replace(/^#{1,6}\s+/gm,'').replace(/[*_`>]/g,'').replace(/\[([^\]]+)\]\([^\)]+\)/g,'$1').replace(/\s+/g,' ').trim().substring(0,420);}

function publishArticles(articles){
  const files=[],first=articles.id||articles.en||articles.es||articles.fr||articles.zh;
  if(!first||!first.title)throw new Error('Artikel utama tidak ditemukan.');
  const translationKey=getToday()+'-'+createSlug(first.title).substring(0,70);
  Object.keys(LANGUAGES).forEach(function(lang){
    const article=articles[lang];
    if(!article||!article.title||!article.content)throw new Error('Artikel bahasa '+lang+' tidak lengkap.');
    const slug=createSlug(article.title); if(!slug)throw new Error('Slug kosong untuk '+lang);
    const path='src/content/blog/'+lang+'/'+getToday()+'-'+slug+'.md';
    githubCreateFile(path,createMarkdown(article,translationKey),'CMS: Add researched blog article ['+lang+'] '+article.title);
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
  if(Array.isArray(article.tags)&&article.tags.length){m+='tags:\n';article.tags.forEach(function(tag){m+='  - "'+yamlEscape(tag)+'"\n';});}
  return m+'---\n\n'+String(article.content).trim()+'\n';
}

function githubCreateFile(path,content,message){
  const p=PropertiesService.getScriptProperties(),token=p.getProperty('GITHUB_TOKEN'),owner=p.getProperty('GITHUB_OWNER'),repo=p.getProperty('GITHUB_REPO'),branch=p.getProperty('GITHUB_BRANCH')||'main';
  if(!token||!owner||!repo)throw new Error('GitHub Script Properties belum lengkap.');
  const url='https://api.github.com/repos/'+owner+'/'+repo+'/contents/'+path;
  const payload={message:message,content:Utilities.base64Encode(Utilities.newBlob(content).getBytes()),branch:branch};
  const r=UrlFetchApp.fetch(url,{method:'put',contentType:'application/json',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},payload:JSON.stringify(payload),muteHttpExceptions:true});
  if(r.getResponseCode()<200||r.getResponseCode()>=300)throw new Error('GitHub error ('+r.getResponseCode()+'): '+r.getContentText());
  return JSON.parse(r.getContentText());
}

function githubCreateBinaryFile(path,bytes,message){
  const p=PropertiesService.getScriptProperties(),token=p.getProperty('GITHUB_TOKEN'),owner=p.getProperty('GITHUB_OWNER'),repo=p.getProperty('GITHUB_REPO'),branch=p.getProperty('GITHUB_BRANCH')||'main';
  if(!token||!owner||!repo)throw new Error('GitHub Script Properties belum lengkap.');
  const url='https://api.github.com/repos/'+owner+'/'+repo+'/contents/'+path;
  const payload={message:message,content:Utilities.base64Encode(bytes),branch:branch};
  const r=UrlFetchApp.fetch(url,{method:'put',contentType:'application/json',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},payload:JSON.stringify(payload),muteHttpExceptions:true});
  if(r.getResponseCode()<200||r.getResponseCode()>=300)throw new Error('GitHub image error ('+r.getResponseCode()+'): '+r.getContentText());
  return JSON.parse(r.getContentText());
}
function createSlug(text){return String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').substring(0,100);}
function normalizeDate(value){const t=String(value||'').trim();return /^\d{4}-\d{2}-\d{2}$/.test(t)?t:getToday();}
function getToday(){return Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'Asia/Makassar','yyyy-MM-dd');}
function yamlEscape(value){return String(value).replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r?\n/g,' ');}
function jsonResponse(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
