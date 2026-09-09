const OPENAI_MODEL='gpt-5.6-luna';
const DEEPSEEK_MODEL='deepseek-v4-flash';
const OPENAI_URL='https://api.openai.com/v1/responses';
const DEEPSEEK_URL='https://api.deepseek.com/responses';
const WIKIMEDIA_API='https://commons.wikimedia.org/w/api.php';
const DEFAULT_IMAGE='/images/Poganda-Beach-Banggai-IndonesiaJuara-Trip.webp';
const LANGUAGES={id:'Indonesian',en:'English',es:'Spanish',fr:'French',zh:'Chinese'};
const RESEARCH_CONTEXT_SIZE='medium';
const MAX_RESEARCH_CHARS=10000;
const MAX_RETRIES=3;
const BATCH_SIZE=2;

function doGet(){return jsonResponse({ok:true,service:'Banggai Wonderland CMS',version:'4.0-dual-research'});}

function doPost(e){
  try{
    if(!e||!e.postData||!e.postData.contents)throw new Error('Request data tidak ditemukan.');
    const data=JSON.parse(e.postData.contents);checkAccessKey(data.accessKey);
    if(data.action==='searchImage')return jsonResponse({ok:true,image:findRelevantImage(String(data.topic||''))});
    if(data.action==='uploadImage')return jsonResponse({ok:true,image:uploadImage(data)});
    if(data.action==='generate'){
      const topic=String(data.topic||'').trim();
      if(!topic)throw new Error('Topic artikel wajib diisi.');
      return jsonResponse({ok:true,articles:generateArticles(topic,data.image,data.provider||'deepseek')});
    }
    if(data.action==='publish'){
      if(!data.articles||typeof data.articles!=='object')throw new Error('Data artikel tidak ditemukan.');
      const result=publishArticles(data.articles);
      return jsonResponse({ok:true,message:'5 versi artikel berhasil dipublish ke GitHub.',files:result.files});
    }
    throw new Error('Action tidak dikenal.');
  }catch(error){return jsonResponse({ok:false,error:error&&error.message?error.message:String(error)});}
}

function checkAccessKey(value){
  const expected=PropertiesService.getScriptProperties().getProperty('CMS_ACCESS_KEY');
  if(!expected)throw new Error('CMS_ACCESS_KEY belum diset di Script Properties.');
  if(!value||value!==expected)throw new Error('Access key tidak valid.');
}

function getApiConfig(provider){
  provider=String(provider||'deepseek').toLowerCase()==='openai'?'openai':'deepseek';
  const props=PropertiesService.getScriptProperties();
  if(provider==='openai'){
    const key=props.getProperty('OPENAI_API_KEY');
    if(!key)throw new Error('OPENAI_API_KEY belum diset di Script Properties.');
    return {provider:'openai',key:key,model:OPENAI_MODEL,url:OPENAI_URL};
  }
  const key=props.getProperty('DEEPSEEK_API_KEY');
  if(!key)throw new Error('DEEPSEEK_API_KEY belum diset di Script Properties.');
  return {provider:'deepseek',key:key,model:DEEPSEEK_MODEL,url:DEEPSEEK_URL};
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
    originalName=String(data.fileName||originalName);blob=Utilities.newBlob(bytes,mime,originalName);
  }else if(data.imageUrl){
    source=String(data.imageUrl).trim();
    if(!/^https?:\/\//i.test(source))throw new Error('Link foto harus dimulai dengan http:// atau https://.');
    const r=UrlFetchApp.fetch(source,{method:'get',followRedirects:true,muteHttpExceptions:true});
    if(r.getResponseCode()<200||r.getResponseCode()>=300)throw new Error('Tidak dapat mengambil foto dari link ('+r.getResponseCode()+').');
    blob=r.getBlob();if(blob.getBytes().length>8*1024*1024)throw new Error('Foto dari link berukuran lebih dari 8 MB.');
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
  if(mime==='image/jpeg')return'jpg';if(mime==='image/png')return'png';if(mime==='image/webp')return'webp';if(mime==='image/gif')return'gif';if(mime==='image/svg+xml')return'svg';
  const m=String(name||'').toLowerCase().match(/\.(jpg|jpeg|png|webp|gif|svg)$/);return m?(m[1]==='jpeg'?'jpg':m[1]):'jpg';
}

function generateArticles(topic,selectedImage,provider){
  const cfg=getApiConfig(provider);
  const image=selectedImage&&selectedImage.url?selectedImage:findRelevantImage(topic);
  const research=researchTopic(topic,cfg);
  const langs=Object.keys(LANGUAGES),articles={};
  for(let start=0;start<langs.length;start+=BATCH_SIZE){
    const batch=langs.slice(start,start+BATCH_SIZE);
    const requests=batch.map(function(lang){return writerRequest(cfg,topic,LANGUAGES[lang],image,research);});
    const responses=UrlFetchApp.fetchAll(requests);
    responses.forEach(function(response,index){
      const lang=batch[index],status=response.getResponseCode(),raw=response.getContentText();
      if(status===429){
        const retry=aiRequest(cfg,{model:cfg.model,input:buildPrompt(topic,LANGUAGES[lang],image,research)},'Generate ['+lang+']');
        processArticle(lang,retry.data,image,articles);
      }else{
        if(status<200||status>=300)throw new Error((cfg.provider==='deepseek'?'DeepSeek':'OpenAI')+' error ['+lang+'] ('+status+'): '+raw);
        let data;try{data=JSON.parse(raw);}catch(e){throw new Error('Respons AI tidak valid untuk '+lang+'.');}
        processArticle(lang,data,image,articles);
      }
    });
    if(start+batch.length<langs.length)Utilities.sleep(600);
  }
  return articles;
}

function writerRequest(cfg,topic,language,image,research){
  return {url:cfg.url,method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+cfg.key},payload:JSON.stringify({model:cfg.model,input:buildPrompt(topic,language,image,research)}),muteHttpExceptions:true};
}

function researchTopic(topic,cfg){
  const payload={model:cfg.model,tools:[{type:'web_search',search_context_size:RESEARCH_CONTEXT_SIZE}],input:buildResearchPrompt(topic)};
  const result=aiRequest(cfg,payload,'Web research');
  const text=extractAIText(result.data);if(!text)throw new Error('Web research tidak menghasilkan ringkasan.');
  return String(text).substring(0,MAX_RESEARCH_CHARS);
}

function aiRequest(cfg,payload,label){
  let last='';
  for(let attempt=1;attempt<=MAX_RETRIES;attempt++){
    const r=UrlFetchApp.fetch(cfg.url,{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+cfg.key},payload:JSON.stringify(payload),muteHttpExceptions:true});
    const status=r.getResponseCode(),raw=r.getContentText();
    if(status>=200&&status<300){let data;try{data=JSON.parse(raw);}catch(e){throw new Error(label+': Respons AI tidak valid.');}return {data:data,status:status};}
    last=raw;
    if(status!==429||attempt===MAX_RETRIES)throw new Error(label+' error ('+status+'): '+raw);
    Utilities.sleep(1200*attempt);
  }
  throw new Error(label+' gagal: '+last);
}

function buildResearchPrompt(topic){
  return `You are the research editor for Banggai Wonderland. Research this travel topic before the article is written.\n\nTOPIC:\n${topic}\n\nSearch several relevant independent sources. Prioritize official government/tourism sources, reputable travel guides, and useful local sources. Focus only on facts that materially improve the article: exact place names, location, access/transport, approximate travel times, activities, safety, culture/history, local rules, and practical visitor details.\n\nRules:\n- Cross-check important facts where possible.\n- Separate verified facts from estimates and uncertainty.\n- Never invent exact prices, schedules, distances, facilities, historical claims, or access conditions.\n- Prefer current information and flag details that may change.\n- Avoid generic travel advice unrelated to the topic.\n\nReturn a compact RESEARCH PACK with:\nA. Verified facts\nB. Practical access/travel info\nC. Distinctive experiences\nD. Safety/culture/environment\nE. Conflicts or uncertainty\nF. 5-8 best sources with title, domain, and URL\n\nDo not write the final article.`;
}

function buildPrompt(topic,language,image,research){
  return `You are the senior editorial writer for Banggai Wonderland, a premium travel agency.\n\nTOPIC:\n${topic}\n\nTARGET LANGUAGE:\nWrite the complete article in ${language}.\n\nFEATURED IMAGE:\n${image.url||DEFAULT_IMAGE}\n\nVERIFIED WEB RESEARCH PACK:\n${research}\n\nWrite a useful, authoritative, immersive travel article based on the research pack. Target approximately 1,200–1,800 words when the subject supports it. Never add filler. Make it destination-specific, not generic AI copy.\n\nInclude: strong opening; concrete facts; clear H2/H3; substantial sections for important places; location and real visitor experience; access and practical details; quick facts/table when useful; practical planning; realistic itinerary when supported; safety/weather/environment/cultural etiquette; useful FAQ; natural Banggai Wonderland CTA.\n\nFACTUALITY: research pack is the factual foundation; never invent missing details; explain uncertainty when sources disagree; never present estimates as exact facts; do not mention AI or the research process.\n\nSEO: use search intent naturally in title, introduction, a relevant heading and body; semantic phrases without stuffing; compelling meta title/description; descriptive image alt text.\n\nSTYLE: premium, warm, specific, confident, informative, immersive, natural. Avoid repetitive cliches such as “hidden gem”, “breathtaking”, “paradise”, and “for those seeking” unless genuinely appropriate.\n\nMARKDOWN only, no HTML.\n\nRETURN ONLY VALID JSON:\n{"title":"SEO-friendly article title","description":"Short article description","seoTitle":"SEO title","seoDescription":"SEO meta description","image":"${image.url||DEFAULT_IMAGE}","imageAlt":"Descriptive image alt text","author":"Banggai Wonderland","pubDate":"${getToday()}","tags":["Banggai","Indonesia","Travel"],"content":"Complete travel article in Markdown"}`;
}

function processArticle(lang,data,image,articles){
  const output=extractAIText(data);if(!output)throw new Error('AI tidak mengembalikan output teks untuk '+lang+'.');
  let article;try{article=JSON.parse(cleanJsonOutput(output));}catch(e){throw new Error('Output AI bukan JSON valid untuk '+lang+'.');}
  validateArticle(article);
  articles[lang]={title:String(article.title),description:String(article.description),seoTitle:String(article.seoTitle||''),seoDescription:String(article.seoDescription||''),image:image.url||DEFAULT_IMAGE,imageAlt:String(article.imageAlt||''),imageSource:String(image.source||''),author:String(article.author||'Banggai Wonderland'),pubDate:String(article.pubDate||getToday()),tags:Array.isArray(article.tags)?article.tags.map(String):['Banggai','Indonesia','Travel'],content:String(article.content),preview:createPreview(article.content)};
}

function extractAIText(response){
  if(response&&response.output_text)return response.output_text;
  if(response&&Array.isArray(response.output))for(let i=0;i<response.output.length;i++){const item=response.output[i];if(!item.content)continue;for(let j=0;j<item.content.length;j++){if(item.content[j].type==='output_text'&&item.content[j].text)return item.content[j].text;}}
  if(response&&response.choices&&response.choices[0]&&response.choices[0].message&&response.choices[0].message.content)return response.choices[0].message.content;
  return '';
}
function cleanJsonOutput(v){return String(v||'').replace(/^\s*```json\s*/i,'').replace(/^\s*```\s*/i,'').replace(/\s*```\s*$/i,'').trim();}
function validateArticle(a){['title','description','author','pubDate','content'].forEach(function(f){if(a[f]===undefined||a[f]===null||String(a[f]).trim()==='')throw new Error('Field artikel tidak lengkap: '+f);});if(String(a.content).length<3500)throw new Error('Artikel terlalu pendek. Minimum editorial quality belum terpenuhi.');}
function createPreview(content){return String(content||'').replace(/^#{1,6}\s+/gm,'').replace(/[*_`>]/g,'').replace(/\[([^\]]+)\]\([^\)]+\)/g,'$1').replace(/\s+/g,' ').trim().substring(0,420);}

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
  let r;try{r=UrlFetchApp.fetch(WIKIMEDIA_API+'?'+params,{method:'get',muteHttpExceptions:true,headers:{'User-Agent':'BanggaiWonderlandCMS/4.0'}});}catch(e){return null;}
  if(r.getResponseCode()<200||r.getResponseCode()>=300)return null;let data;try{data=JSON.parse(r.getContentText());}catch(e){return null;}
  const pages=data.query&&data.query.pages?Object.keys(data.query.pages).map(k=>data.query.pages[k]):[],normalized=normalizeSearchText(query),words=normalized.split(' ').filter(w=>w.length>=4);let best=null,bestScore=-1;
  pages.forEach(function(page){const info=page.imageinfo&&page.imageinfo[0];if(!info||!info.url)return;const mime=String(info.mime||'').toLowerCase();if(mime==='image/svg+xml'||mime.indexOf('image/')!==0)return;const title=normalizeSearchText(page.title||'');let score=0;words.forEach(w=>{if(title.indexOf(w)!==-1)score+=5;});if(title.indexOf('mbuang')!==-1&&normalized.indexOf('mbuang')!==-1)score+=30;if(title.indexOf('paisupok')!==-1&&normalized.indexOf('paisupok')!==-1)score+=30;if(title.indexOf('poganda')!==-1&&normalized.indexOf('poganda')!==-1)score+=30;if(title.indexOf('banggai')!==-1)score+=5;if(info.width&&info.height&&Number(info.width)*Number(info.height)>=1000000)score+=3;if(score>bestScore){bestScore=score;const meta=info.extmetadata||{};best={url:info.thumburl||info.url,alt:meta.ImageDescription&&meta.ImageDescription.value?stripHtml(meta.ImageDescription.value):String(page.title||'Banggai destination'),source:info.descriptionurl||''};}});return best;
}
function normalizeSearchText(v){return String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function stripHtml(v){return String(v||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();}

function publishArticles(articles){
  const files=[],first=articles.id||articles.en||articles.es||articles.fr||articles.zh;if(!first||!first.title)throw new Error('Artikel utama tidak ditemukan.');
  const translationKey=getToday()+'-'+createSlug(first.title).substring(0,70);
  Object.keys(LANGUAGES).forEach(function(lang){const article=articles[lang];if(!article||!article.title||!article.content)throw new Error('Artikel bahasa '+lang+' tidak lengkap.');const slug=createSlug(article.title);if(!slug)throw new Error('Slug kosong untuk '+lang);const path='src/content/blog/'+lang+'/'+getToday()+'-'+slug+'.md';githubCreateFile(path,createMarkdown(article,translationKey),'CMS: Add researched blog article ['+lang+'] '+article.title);files.push({language:lang,path:path,title:article.title});});
  return {files:files};
}
function createMarkdown(article,translationKey){
  let m='---\n';m+='title: "'+yamlEscape(article.title)+'"\n';m+='description: "'+yamlEscape(article.description)+'"\n';if(article.seoTitle)m+='seoTitle: "'+yamlEscape(article.seoTitle)+'"\n';if(article.seoDescription)m+='seoDescription: "'+yamlEscape(article.seoDescription)+'"\n';m+='image: "'+yamlEscape(article.image||DEFAULT_IMAGE)+'"\n';if(article.imageAlt)m+='imageAlt: "'+yamlEscape(article.imageAlt)+'"\n';if(article.imageSource)m+='imageSource: "'+yamlEscape(article.imageSource)+'"\n';m+='author: "'+yamlEscape(article.author||'Banggai Wonderland')+'"\n';m+='pubDate: '+normalizeDate(article.pubDate)+'\n';m+='translationKey: "'+yamlEscape(translationKey)+'"\n';if(Array.isArray(article.tags)&&article.tags.length){m+='tags:\n';article.tags.forEach(function(tag){m+='  - "'+yamlEscape(tag)+'"\n';});}return m+'---\n\n'+String(article.content).trim()+'\n';
}
function githubCreateFile(path,content,message){const p=PropertiesService.getScriptProperties(),token=p.getProperty('GITHUB_TOKEN'),owner=p.getProperty('GITHUB_OWNER'),repo=p.getProperty('GITHUB_REPO'),branch=p.getProperty('GITHUB_BRANCH')||'main';if(!token||!owner||!repo)throw new Error('GitHub Script Properties belum lengkap.');const url='https://api.github.com/repos/'+owner+'/'+repo+'/contents/'+path;const payload={message:message,content:Utilities.base64Encode(Utilities.newBlob(content).getBytes()),branch:branch};const r=UrlFetchApp.fetch(url,{method:'put',contentType:'application/json',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},payload:JSON.stringify(payload),muteHttpExceptions:true});if(r.getResponseCode()<200||r.getResponseCode()>=300)throw new Error('GitHub error ('+r.getResponseCode()+'): '+r.getContentText());return JSON.parse(r.getContentText());}
function githubCreateBinaryFile(path,bytes,message){const p=PropertiesService.getScriptProperties(),token=p.getProperty('GITHUB_TOKEN'),owner=p.getProperty('GITHUB_OWNER'),repo=p.getProperty('GITHUB_REPO'),branch=p.getProperty('GITHUB_BRANCH')||'main';if(!token||!owner||!repo)throw new Error('GitHub Script Properties belum lengkap.');const url='https://api.github.com/repos/'+owner+'/'+repo+'/contents/'+path;const payload={message:message,content:Utilities.base64Encode(bytes),branch:branch};const r=UrlFetchApp.fetch(url,{method:'put',contentType:'application/json',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},payload:JSON.stringify(payload),muteHttpExceptions:true});if(r.getResponseCode()<200||r.getResponseCode()>=300)throw new Error('GitHub image error ('+r.getResponseCode()+'): '+r.getContentText());return JSON.parse(r.getContentText());}
function createSlug(text){return String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').substring(0,100);}
function normalizeDate(v){const t=String(v||'').trim();return /^\d{4}-\d{2}-\d{2}$/.test(t)?t:getToday();}
function getToday(){return Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'Asia/Makassar','yyyy-MM-dd');}
function yamlEscape(v){return String(v).replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r?\n/g,' ');}
function jsonResponse(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
