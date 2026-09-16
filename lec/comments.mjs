const section=document.querySelector('#comments');
const issue=Number(section.dataset.issue);
const list=document.querySelector('#comments-list');
const status=document.querySelector('#comments-status');
const refresh=document.querySelector('#comments-refresh');
const more=document.querySelector('#comments-more');
let nextPage=1,busy=false;
function render(comment){
 const article=document.createElement('article');article.className='github-comment';
 const header=document.createElement('header');
 const author=document.createElement('strong');author.textContent=comment.user?.login || '삭제된 계정';
 const date=document.createElement('time');const timestamp=new Date(comment.created_at);
 if(!Number.isNaN(timestamp.valueOf())){date.dateTime=timestamp.toISOString();date.textContent=timestamp.toLocaleString('ko-KR');}
 const link=document.createElement('a');link.textContent='GitHub에서 보기 ↗';link.target='_blank';link.rel='noopener noreferrer';
 link.href=`https://github.com/jhs512/topcit2/issues/${issue}#issuecomment-${Number(comment.id)}`;
 const body=document.createElement('p');body.className='comment-body';body.textContent=comment.body_text ?? comment.body ?? '';
 header.append(author,date,link);article.append(header,body);return article;
}
async function load(reset=false){
 if(busy)return;busy=true;refresh.disabled=true;more.disabled=true;section.setAttribute('aria-busy','true');
 const page=reset?1:nextPage;
 status.textContent='댓글을 불러오는 중입니다.';
 try{
  if(!Number.isSafeInteger(issue)||issue<1)throw new Error('Invalid issue');
  const response=await fetch(`https://api.github.com/repos/jhs512/topcit2/issues/${issue}/comments?per_page=30&page=${page}`,{headers:{Accept:'application/vnd.github.text+json'},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('Comments unavailable');
  const comments=await response.json();if(!Array.isArray(comments))throw new Error('Invalid response');
  if(reset)list.replaceChildren();
  list.append(...comments.filter(c=>!c.minimized).map(render));
  nextPage=page+1;more.hidden=!(response.headers.get('link')||'').includes('rel="next"');
  status.textContent=list.children.length?`댓글 ${list.children.length}개를 표시했습니다.`:'아직 댓글이 없습니다. 첫 질문이나 학습 소감을 남겨 주세요.';
 }catch{status.textContent='댓글을 불러오지 못했습니다. 새로고침하거나 위의 GitHub 링크에서 확인해 주세요.';}
 finally{busy=false;refresh.disabled=false;more.disabled=false;section.removeAttribute('aria-busy');}
}
refresh.addEventListener('click',()=>load(true));more.addEventListener('click',()=>load());load(true);
