(()=>{
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl=(url,forImage=false)=>{try{const u=new URL(String(url),location.origin);if(!['http:','https:'].includes(u.protocol)&&!(u.protocol==='/' ))return '';return esc(u.href)}catch{return ''}};
  const inline=s=>{
    let x=esc(s);
    x=x.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g,(_,alt,url)=>{const u=safeUrl(url,true);return u?`<img src="${u}" alt="${alt}" loading="lazy">`:esc(_)});
    x=x.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)(?:\s+["']([^"']*)["'])?\)/g,(_,label,url,title)=>{const u=safeUrl(url);return u?`<a href="${u}" target="_blank" rel="noopener noreferrer"${title?` title="${esc(title)}"`:''}>${label}</a>`:label});
    x=x.replace(/`([^`\n]+)`/g,'<code>$1</code>');
    x=x.replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>').replace(/__([^_\n]+)__/g,'<strong>$1</strong>');
    x=x.replace(/~~([^~\n]+)~~/g,'<del>$1</del>');
    x=x.replace(/(?<![\w*])\*([^*\n]+)\*(?!\*)/g,'<em>$1</em>').replace(/(?<![\w_])_([^_\n]+)_(?![\w_])/g,'<em>$1</em>');
    x=x.replace(/(^|\s)(https?:\/\/[^\s<]+)/g,(m,p,url)=>`${p}<a href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer">${url}</a>`);
    return x;
  };
  const tableCells=line=>line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(x=>x.trim());
  function render(md){
    const lines=String(md||'').replace(/\r/g,'').split('\n');let out='',i=0,para=[];
    const flush=()=>{if(!para.length)return;out+='<p>'+para.map(inline).join('<br>')+'</p>';para=[]};
    while(i<lines.length){
      const line=lines[i];
      if(/^\s*$/.test(line)){flush();i++;continue}
      if(/^\s*(```|~~~)/.test(line)){flush();const fence=line.match(/^\s*(```|~~~)\s*([^\s]*)/);const marker=fence[1],lang=fence[2]||'';i++;let code=[];while(i<lines.length&&!new RegExp('^\\s*'+marker).test(lines[i]))code.push(lines[i++]);if(i<lines.length)i++;out+=`<pre><code${lang?` data-language="${esc(lang)}"`:''}>${esc(code.join('\n'))}</code></pre>`;continue}
      let m=line.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/);if(m){flush();const n=m[1].length;out+=`<h${n}>${inline(m[2])}</h${n}>`;i++;continue}
      if(/^\s*(\*\s*){3,}$|^\s*(-\s*){3,}$|^\s*(_\s*){3,}$/.test(line)){flush();out+='<hr>';i++;continue}
      if(/^\s*>/.test(line)){flush();const q=[];while(i<lines.length&&/^\s*>/.test(lines[i])){q.push(lines[i++].replace(/^\s*>\s?/,''));}out+='<blockquote>'+render(q.join('\n'))+'</blockquote>';continue}
      if(/^\s*[-+*]\s+/.test(line)){flush();const items=[];while(i<lines.length&&/^\s*[-+*]\s+/.test(lines[i]))items.push(lines[i++].replace(/^\s*[-+*]\s+/,''));out+='<ul>'+items.map(x=>'<li>'+inline(x)+'</li>').join('')+'</ul>';continue}
      if(/^\s*\d+[.)]\s+/.test(line)){flush();const items=[];while(i<lines.length&&/^\s*\d+[.)]\s+/.test(lines[i]))items.push(lines[i++].replace(/^\s*\d+[.)]\s+/,''));out+='<ol>'+items.map(x=>'<li>'+inline(x)+'</li>').join('')+'</ol>';continue}
      if(/^\s*\|/.test(line)&&i+1<lines.length&&/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[i+1])){flush();const head=tableCells(lines[i++]),align=tableCells(lines[i++]);const aligns=align.map(x=>x.startsWith(':')&&x.endsWith(':')?'center':x.startsWith(':')?'left':x.endsWith(':')?'right':'');let rows=[];while(i<lines.length&&/^\s*\|/.test(lines[i]))rows.push(tableCells(lines[i++]));out+='<div class="md-table-wrap"><table><thead><tr>'+head.map((x,k)=>`<th${aligns[k]?` style="text-align:${aligns[k]}"`:''}>${inline(x)}</th>`).join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map((x,k)=>`<td${aligns[k]?` style="text-align:${aligns[k]}"`:''}>${inline(x)}</td>`).join('')+'</tr>').join('')+'</tbody></table></div>';continue}
      para.push(line);i++;
    }
    flush();return out;
  }
  const fix=()=>document.querySelectorAll('[data-preview-box]').forEach(box=>{const card=box.closest('.lang');const ta=card?.querySelector('textarea[data-field="content"]');if(ta&&box.classList.contains('show'))box.innerHTML=render(ta.value)});
  document.addEventListener('click',e=>{const b=e.target.closest?.('[data-preview]');if(b)setTimeout(fix,0)},true);
  const style=document.createElement('style');style.textContent=`
    .preview{font-size:16px!important;line-height:1.8!important}
    .preview h1{font-size:2.15em!important;line-height:1.15!important;margin:0 0 .7em!important;font-weight:800!important}
    .preview h2{font-size:1.8em!important;line-height:1.2!important;margin:1.25em 0 .6em!important;font-weight:800!important}
    .preview h3{font-size:1.5em!important;line-height:1.25!important;margin:1.15em 0 .55em!important;font-weight:800!important}
    .preview h4{font-size:1.25em!important;font-weight:800!important}.preview h5{font-size:1.1em!important;font-weight:800!important}.preview h6{font-size:1em!important;font-weight:800!important;text-transform:uppercase;letter-spacing:.03em}
    .preview p{font-size:1em!important}.preview strong{font-weight:800}.preview del{text-decoration:line-through}.preview .md-table-wrap{width:100%;overflow-x:auto}.preview table{display:table!important;overflow:visible!important;min-width:100%;border-collapse:collapse}.preview th,.preview td{vertical-align:top}.preview pre{font-size:.9em}.preview code{font-size:.92em}
  `;document.head.appendChild(style);
  const observer=new MutationObserver(()=>{document.querySelectorAll('.status').forEach(el=>{if(el.textContent.includes('Gemini'))el.textContent=el.textContent.replaceAll('Gemini','OpenAI')})});
  observer.observe(document.body,{subtree:true,childList:true,characterData:true});
})();
