(()=>{
  const escapeText=s=>String(s??'').replace(/\u00a0/g,' ');
  const hasMarkdown=s=>/(^|\n)\s{0,3}#{1,6}\s+\S|\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|```|\[[^\]]+\]\([^\)]+\)|(^|\n)\s*[-+*]\s+|(^|\n)\s*\d+[.)]\s+|(^|\n)>\s?/.test(String(s||''));
  const inline=node=>{
    if(node.nodeType===3)return escapeText(node.nodeValue);
    if(node.nodeType!==1)return '';
    const tag=node.tagName.toLowerCase();
    if(tag==='br')return '\n';
    if(tag==='strong'||tag==='b')return '**'+Array.from(node.childNodes).map(inline).join('')+'**';
    if(tag==='em'||tag==='i')return '*'+Array.from(node.childNodes).map(inline).join('')+'*';
    if(tag==='del'||tag==='s'||tag==='strike')return '~~'+Array.from(node.childNodes).map(inline).join('')+'~~';
    if(tag==='code'&&!['PRE'].includes(node.parentElement?.tagName))return '`'+node.textContent+'`';
    if(tag==='a'){const text=Array.from(node.childNodes).map(inline).join('').trim()||node.href;return '['+text+']('+node.href+(node.title?' "'+node.title.replace(/"/g,'\\"')+'"':'')+')';}
    if(tag==='img')return '!['+(node.alt||'')+']('+(node.src||'')+')';
    return Array.from(node.childNodes).map(inline).join('');
  };
  const block=(node,depth=0)=>{
    if(node.nodeType===3)return escapeText(node.nodeValue);
    if(node.nodeType!==1)return '';
    const tag=node.tagName.toLowerCase();
    if(/^h[1-6]$/.test(tag))return '#'.repeat(Number(tag[1]))+' '+Array.from(node.childNodes).map(inline).join('').trim()+'\n\n';
    if(tag==='p')return Array.from(node.childNodes).map(inline).join('').trim()+'\n\n';
    if(tag==='blockquote')return Array.from(node.childNodes).map(n=>block(n,depth)).join('').trim().split('\n').map(x=>'> '+x).join('\n')+'\n\n';
    if(tag==='pre')return '```\n'+node.textContent.replace(/\r/g,'')+'\n```\n\n';
    if(tag==='hr')return '---\n\n';
    if(tag==='ul'||tag==='ol'){
      let n=0;const out=[];
      Array.from(node.children).forEach(li=>{if(li.tagName.toLowerCase()!=='li')return;n++;const body=Array.from(li.childNodes).map(x=>x.tagName?.toLowerCase()==='ul'||x.tagName?.toLowerCase()==='ol'?block(x,depth+1):inline(x)).join('').trim();const lines=body.split('\n');out.push((tag==='ol'?n+'. ':'- ')+lines[0]);for(let j=1;j<lines.length;j++)if(lines[j].trim())out.push('  '+lines[j]);});
      return out.join('\n')+'\n\n';
    }
    if(tag==='table'){
      const rows=Array.from(node.querySelectorAll('tr')).map(tr=>Array.from(tr.children).map(c=>Array.from(c.childNodes).map(inline).join('').replace(/\n/g,' ').trim()));
      if(!rows.length)return '';
      const width=Math.max(...rows.map(r=>r.length));rows.forEach(r=>{while(r.length<width)r.push('')});
      return '| '+rows[0].join(' | ')+' |\n| '+rows[0].map(()=> '---').join(' | ')+' |\n'+rows.slice(1).map(r=>'| '+r.join(' | ')+' |').join('\n')+'\n\n';
    }
    if(tag==='div'||tag==='section'||tag==='article'||tag==='main'||tag==='body')return Array.from(node.childNodes).map(n=>block(n,depth)).join('');
    return Array.from(node.childNodes).map(inline).join('');
  };
  const htmlToMarkdown=html=>{
    const doc=new DOMParser().parseFromString(html,'text/html');
    let md=Array.from(doc.body.childNodes).map(n=>block(n)).join('');
    md=md.replace(/\n{3,}/g,'\n\n').replace(/[ \t]+\n/g,'\n').trim();
    return md;
  };
  const attach=()=>{
    const ta=document.getElementById('m-content');
    if(!ta||ta.dataset.smartPaste==='1')return !!ta;
    ta.dataset.smartPaste='1';
    ta.addEventListener('paste',e=>{
      const clip=e.clipboardData;
      if(!clip)return;
      const text=clip.getData('text/plain')||'';
      const html=clip.getData('text/html')||'';
      if(!html)return;
      if(hasMarkdown(text))return;
      const md=htmlToMarkdown(html);
      if(!md)return;
      e.preventDefault();
      const start=ta.selectionStart,end=ta.selectionEnd;
      ta.setRangeText(md,start,end,'end');
      ta.dispatchEvent(new Event('input',{bubbles:true}));
    });
    return true;
  };
  if(!attach())new MutationObserver(()=>attach()).observe(document.documentElement,{childList:true,subtree:true});
})();
