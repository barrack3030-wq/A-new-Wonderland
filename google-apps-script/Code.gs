const OPENAI_MODEL = 'gpt-5.6-luna';
const WIKIMEDIA_API = 'https://commons.wikimedia.org/w/api.php';
const DEFAULT_IMAGE = '/images/Poganda-Beach-Banggai-IndonesiaJuara-Trip.webp';
const LANGUAGES = { id:'Indonesian', en:'English', es:'Spanish', fr:'French', zh:'Chinese' };
const RESEARCH_CONTEXT_SIZE = 'medium';
const MAX_RESEARCH_CHARS = 18000;
const OPENAI_MAX_RETRIES = 3;

function doGet(){ return jsonResponse({ok:true,service:'Banggai Wonderland CMS',version:'2.1-research-stable'}); }

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
  const research=researchTopic(topic,apiKey);
  const langs=Object.keys(LANGUAGES);
  const articles={};

  // Generate one language at a time to avoid a 5-request TPM spike.
  langs.forEach(function(lang,index){
    const payload={
      model:OPENAI_MODEL,
      input:buildPrompt(topic,LANGUAGES[lang],image,research)
    };
    const response=openAIRequest(apiKey,payload,'Generate ['+lang+']');
    const output=extractOpenAIText(response.data);
    if(!output) throw new Error('OpenAI tidak mengembalikan output teks untuk '+lang+'.');
    const cleaned=cleanJsonOutput(output);
    let article; try{article=JSON.parse(cleaned);}catch(e){throw new Error('Output OpenAI bukan JSON valid untuk '+lang+'.');}
    validateArticle(article);
    articles[lang]={title:String(article.title),description:String(article.description),seoTitle:article.seoTitle?String(article.seoTitle):'',seoDescription:article.seoDescription?String(article.seoDescription):'',image:image.url||DEFAULT_IMAGE,imageAlt:article.imageAlt?String(article.imageAlt):'',imageSource:image.source||'',author:article.author?String(article.author):'Banggai Wonderland',pubDate:article.pubDate?String(article.pubDate):getToday(),tags:Array.isArray(article.tags)?article.tags.map(String):['Banggai','Indonesia','Travel'],content:String(article.content),preview:createPreview(article.content)};
    if(index<langs.length-1) Utilities.sleep(800);
  });
  return articles;
}

function researchTopic(topic,apiKey){
  const payload={
    model:OPENAI_MODEL,
    tools:[{type:'web_search',search_context_size:RESEARCH_CONTEXT_SIZE}],
    input:buildResearchPrompt(topic)
  };
  const response=openAIRequest(apiKey,payload,'Web research');
  const text=extractOpenAIText(response.data);
  if(!text) throw new Error('Web research tidak menghasilkan ringkasan.');
  return String(text).substring(0,MAX_RESEARCH_CHARS);
}

function openAIRequest(apiKey,payload,label){
  let lastBody='';
  for(let attempt=1;attempt<=OPENAI_MAX_RETRIES;attempt++){
    const response=UrlFetchApp.fetch('https://api.openai.com/v1/responses',{
      method:'post',
      contentType:'application/json',
      headers:{Authorization:'Bearer '+apiKey},
      payload:JSON.stringify(payload),
      muteHttpExceptions:true
    });
    const status=response.getResponseCode();
    const raw=response.getContentText();
    if(status>=200&&status<300){
      let data;try{data=JSON.parse(raw);}catch(e){throw new Error(label+': Respons OpenAI tidak valid.');}
      return {data:data,status:status};
    }
    lastBody=raw;
    if(status!==429 || attempt===OPENAI_MAX_RETRIES){
      throw new Error(label+' error ('+status+'): '+raw);
    }
    const waitMs=1500*attempt;
    Utilities.sleep(waitMs);
  }
  throw new Error(label+' gagal: '+lastBody);
}

function buildResearchPrompt(topic){
  return `You are the research editor for Banggai Wonderland. Research this travel topic before the article is written.\n\nTOPIC:\n${topic}\n\nSearch multiple independent sources. Prioritize official government/tourism sources, reputable travel guides, local news/local websites, and reliable reference sources. Focus only on facts relevant to the topic: exact place names, location, access/transport, approximate travel times, activities, safety, culture/history, local rules, and practical visitor details.\n\nRules:\n- Cross-check important facts where possible.\n- Separate verified facts from estimates, opinions, and uncertainty.\n- Never invent exact prices, schedules, distances, facilities, historical claims, or access conditions.\n- Prefer current information and flag details that may change.\n- Do not pad with generic travel advice.\n\nReturn a compact RESEARCH PACK with:\nA. Verified facts\nB. Practical access/travel info\nC. Distinctive experiences\nD. Safety/culture/environment\nE. Conflicts or uncertainty\nF. 5-10 best sources with title, domain, and URL\n\nDo not write the final article.`;
}

function buildPrompt(topic,language,image,research){
  return `You are the senior editorial writer for Banggai Wonderland, a premium travel agency.\n\nTOPIC:\n${topic}\n\nTARGET LANGUAGE:\nWrite the complete article in ${language}.\n\nFEATURED IMAGE:\n${image.url||DEFAULT_IMAGE}\n\nVERIFIED WEB RESEARCH PACK:\n${research}\n\nWrite a genuinely useful, authoritative, immersive long-form travel article based on the research pack. Aim for 1,800–2,500+ words when the subject supports it; never add filler. The article must feel destination-specific, not generic AI copy.\n\nInclude:\n- Strong opening matching search intent.\n- Concrete facts and practical visitor information.\n- Clear H2/H3 structure.\n- Substantial sections for important places.\n- Location, character, real visitor experience, access, practical considerations, and why it is worth visiting when supported by research.\n- Quick facts/table when useful.\n- Practical planning and a realistic itinerary/combo route when supported.\n- Safety, weather, environment and cultural etiquette where relevant.\n- Useful FAQ.\n- Natural Banggai Wonderland CTA.\n\nFACTUALITY:\n- Research pack is the factual foundation.\n- Never invent missing details.\n- If sources disagree, explain the uncertainty.\n- Never present estimates as exact facts.\n- Do not mention AI, prompts, or research process.\n\nSEO:\nUse the main search intent naturally in title, introduction, a relevant heading and body. Use semantic related phrases without keyword stuffing. Produce a compelling meta title, meta description and descriptive image alt text.\n\nSTYLE:\nPremium, warm, specific, confident, informative, immersive, natural. Avoid repetitive cliches such as “hidden gem”, “breathtaking”, “paradise”, and “for those seeking” unless genuinely appropriate.\n\nMARKDOWN:\nMarkdown only, no HTML.\n\nRETURN ONLY VALID JSON:\n{"title":"SEO-friendly article title","description":"Short article description","seoTitle":"SEO title","seoDescription":"SEO meta description","image":"${image.url||DEFAULT_IMAGE}","imageAlt":"Descriptive image alt text","author":"Banggai Wonderland","pubDate":"${getToday()}","tags":["Banggai","Indonesia","Travel"],"content":"Complete long-form Markdown article"}\n\nDo not wrap the JSON in markdown fences.`;
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
function cleanJsonOutput(output){return String(output||'').replace(/^\s*```json\s*/i,'').replace(/^\s*```\s*/i,'').replace(/\s*```\s*$/i,'').trim();}
function validateArticle(article){
  ['title','description','author','pubDate','content'].forEach(function(field){if(article[field]===undefined||article[field]===null||String(article[field]).trim()==='')throw new Error('Field artikel tidak lengkap: '+field);});
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
    const slug=createSlug(article.title);if(!slug)throw new Error('Slug kosong untuk '+lang);
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
