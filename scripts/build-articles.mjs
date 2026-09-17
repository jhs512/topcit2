import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Marked} from 'marked';
import {chromium} from 'playwright';
import {articles,tableTitles} from '../article/catalog.mjs';
import {learningSubjects} from '../shared/learning-subjects.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const server=createServer(async(req,res)=>{
  try{
    const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
    if(req.url!=='/'&&!path.startsWith(root.endsWith(sep)?root:root+sep)){res.writeHead(403).end();return;}
    if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<html lang="ko"><meta charset="utf-8"><body></body></html>');return;}
    res.setHeader('Content-Type',extname(path)==='.mjs'||extname(path)==='.js'?'text/javascript':'application/octet-stream');
    res.end(await readFile(path));
  }catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch();
const report=[];
try{
  const page=await browser.newPage({viewport:{width:1500,height:1000}});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(async()=>{window.mermaid=(await import('/node_modules/mermaid/dist/mermaid.esm.min.mjs')).default;mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'base',fontFamily:'Arial, Malgun Gothic, sans-serif',themeVariables:{fontSize:'17px',primaryColor:'#edf5f0',primaryTextColor:'#17382b',primaryBorderColor:'#44785e',lineColor:'#527163',secondaryColor:'#fff4db',tertiaryColor:'#f0f3f6'},flowchart:{htmlLabels:false,useMaxWidth:true},sequence:{useMaxWidth:true,wrap:true},gantt:{useMaxWidth:true}});});
  await mkdir(resolve(root,'article/assets'),{recursive:true});
  for(const article of articles){
    const source=(await readFile(resolve(root,`article/content/${article.id}.md`),'utf8')).replace(/\r\n/g,'\n');
    if(!source.startsWith('# '+article.title+'\n'))throw Error('Title mismatch: '+article.id);
    const diagrams=[],headings=[];
    let section=0;
    const md=new Marked({renderer:{
      heading({tokens,depth}){const text=this.parser.parseInline(tokens);if(depth===1)return '';const id=`section-${++section}`;if(depth===2)headings.push({id,text});return `<h${depth} id="${id}" class="tts-readable">${text}</h${depth}>`;},
      paragraph({tokens}){return `<p class="tts-readable">${this.parser.parseInline(tokens)}</p>\n`;},
      code({text,lang}){if(lang?.startsWith('mermaid ')){const index=diagrams.length+1,title=lang.slice(8).trim();diagrams.push({text,title,index});return `<figure class="diagram" id="figure-${index}"><figcaption>그림 ${index}. ${esc(title)}</figcaption><a class="diagram-link" href="../assets/${article.id}-${index}.svg" data-diagram data-caption="${esc(title)}"><img src="../assets/${article.id}-${index}.svg" alt="${esc(title)}" loading="lazy"><span>그림 크게 보기 ↗</span></a></figure>`;}return `<pre><code>${esc(text)}</code></pre>`;},
    }});
    let body=md.parse(source);
    let tableCount=0;
    body=body.replace(/<table>/g,()=>{const title=tableTitles[article.id]?.[tableCount++];if(!title)throw Error('Missing table title '+article.id);return `<div class="table-scroll" tabindex="0" role="region" aria-label="표 ${tableCount}. ${esc(title)}. 가로로 넘겨 읽기"><table><caption>표 ${tableCount}. ${esc(title)}</caption>`;}).replace(/<\/table>/g,'</table></div>');
    for(const diagram of diagrams){
      const svg=await page.evaluate(async({text,id})=>{const r=await mermaid.render(id,text);return r.svg;},{text:diagram.text,id:`diagram-${article.id}-${diagram.index}`});
      if(!svg.includes('<svg')||svg.includes('Syntax error'))throw Error(`Diagram failed ${article.id}/${diagram.index}`);
      await writeFile(resolve(root,`article/assets/${article.id}-${diagram.index}.svg`),svg);
    }
    const subject=learningSubjects.find(s=>s.id===article.id);
    const minutes=Math.max(1,Math.ceil(source.replace(/```[\s\S]*?```/g,'').length/430));
    report.push({id:article.id,title:article.title,characters:source.length,sections:headings.length,diagrams:diagrams.length,tables:tableCount,minutes});
    const peers=articles.filter(a=>a.id!==article.id).map(a=>`<a href="../${a.id}/"><span>${a.id} · ${esc(learningSubjects.find(s=>s.id===a.id).title)}</span>${esc(a.title)}</a>`).join('');
    const html=shell(`${article.title} · article`,'../',`<div class="reading-progress" aria-hidden="true"><i></i></div><main id="main"><header class="article-hero"><a class="back" href="../">← article 전체 글</a><p class="eyebrow">${article.id} · ${esc(subject.title)}</p><h1>${esc(article.title)}</h1><p class="deck">${esc(article.deck)}</p><p class="reading-meta">${esc(article.scene)} · 약 ${minutes}분 · 그림 ${diagrams.length}개 · 표 ${tableCount}개</p><p class="fiction-label">한끼픽 실무 이야기 · 가상 상황을 따라 배우는 글입니다.</p></header><div class="article-layout"><aside class="article-toc"><details open><summary>이야기 순서</summary><ol>${headings.map(h=>`<li><a href="#${h.id}">${h.text}</a></li>`).join('')}</ol></details></aside><article class="prose" data-tts-content>${body}</article></div><section class="other-stories"><h2>같은 서비스를 다른 관점에서 읽기</h2><div>${peers}</div></section></main><dialog class="diagram-dialog" aria-labelledby="diagram-title"><div class="dialog-toolbar"><h2 id="diagram-title">그림</h2><button type="button" data-close>닫기</button></div><p>그림이 크면 가로·세로로 넘겨 읽으세요. Esc 키로 닫을 수 있습니다.</p><div class="zoom-scroll" tabindex="0" role="region" aria-label="확대한 그림"><img alt=""></div><a class="original-diagram" target="_blank" rel="noopener">원본 SVG 열기 ↗</a></dialog>`);
    await mkdir(resolve(root,`article/${article.id}`),{recursive:true});
    await writeFile(resolve(root,`article/${article.id}/index.html`),html);
  }
  const cards=articles.map(a=>{const r=report.find(x=>x.id===a.id);return `<a class="article-card${a.featured?' featured':''}" href="${a.id}/"><span class="eyebrow">${a.id} · ${esc(learningSubjects.find(s=>s.id===a.id).title)}</span><h2>${esc(a.title)}</h2><p>${esc(a.deck)}</p><div class="tags">${a.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div><p class="card-meta">약 ${r.minutes}분 · 그림 ${r.diagrams}개 <span>이야기 읽기 →</span></p></a>`;}).join('');
  await writeFile(resolve(root,'article/index.html'),shell('article · 처음부터 따라가는 실무 이야기','',`<main id="main"><header class="series-hero"><p class="eyebrow">ARTICLE / 한끼픽 실무 이야기</p><h1>처음에는<br>주문 버튼 하나였습니다.</h1><p class="deck">한 가게의 작은 서비스가 자라면서 생긴 문제들.<br>무엇을 보고, 왜 바꿨고, 그 뒤에 무슨 일이 생겼는지 따라갑니다.</p><p>IT를 조금 아는 독자를 위한 긴 글 8편입니다. 각 글은 처음부터 독립적으로 읽을 수 있습니다. UML·구성도·표를 따라가며 실무의 판단을 살펴보세요.</p><a class="start-story" href="03/">서버 한 대로 시작하는 이야기부터 →</a></header><section class="article-grid" aria-label="8개 과목의 실무 이야기">${cards}</section><p class="series-note">사람·서비스·관측 수치는 설명용 가상 설정입니다. 실제 제품의 동작은 글 속 공식 문서 링크에서 확인할 수 있습니다. 교재 순서나 공식 출제 중요도를 뜻하지 않습니다.</p></main>`));
  await writeFile(resolve(root,'article/manifest.json'),JSON.stringify({articles:report,diagramCount:report.reduce((s,x)=>s+x.diagrams,0),tableCount:report.reduce((s,x)=>s+x.tables,0)},null,2)+'\n');
  console.log(JSON.stringify(report));
}finally{await browser.close();await new Promise(r=>server.close(r));}
function shell(title,prefix,content){const shared=prefix?'../../':'../';return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="한끼픽이 처음 서비스를 만들고 문제를 해결하는 과정을 따라가는 실무 이야기"><title>${esc(title)}</title><link rel="stylesheet" href="${prefix}styles.css"><link rel="stylesheet" href="${shared}shared/site-navigation.css"><script type="module" src="${shared}shared/site-navigation.mjs"></script><script type="module" src="${prefix}reader.mjs"></script></head><body><a class="skip-link" href="#main">본문으로 바로가기</a>${content}<footer class="article-footer">article · 한끼픽 실무 이야기</footer></body></html>`;}
