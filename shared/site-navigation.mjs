import { caseSubjects } from './case-catalog.mjs';
import { books } from '../output/markdown/books.mjs';
import { initializeTts } from './speech-loader.mjs?v=20260916-contents-exclusion';

const root = new URL('../', import.meta.url);
const url = path => new URL(path, root).href;
const arrow = '<svg class="site-chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const bar = document.createElement('div');
bar.id = 'site-navigation';
bar.innerHTML = `<a class="site-brand" href="${url('')}">TOPCIT</a><button type="button" id="site-tts-toggle" aria-pressed="false">TTS 꺼짐</button><button class="site-toggle" aria-expanded="false" aria-controls="site-links">메뉴 <span aria-hidden="true">☰</span></button><nav id="site-links" aria-label="사이트 주 메뉴"><div class="site-group"><button aria-expanded="false" aria-controls="site-textbooks"><span>교재</span>${arrow}</button><div id="site-textbooks" class="site-submenu" hidden><a href="${url('textbook/')}">전체 교재</a>${books.map(b => `<a href="${url(`textbook/${b.id}/`)}">${b.id} ${b.title}</a>`).join('')}</div></div><div class="site-group"><button aria-expanded="false" aria-controls="site-practice"><span>문제</span>${arrow}</button><div id="site-practice" class="site-submenu" hidden><a href="${url('practice/')}">전체 문제</a>${books.map(b => `<a href="${url(`practice/${b.id}/`)}">${b.id} ${b.title}</a>`).join('')}</div></div><a href="${url('info/')}">시험 안내</a><div class="site-group"><button aria-expanded="false" aria-controls="site-cases"><span>사례 모음</span>${arrow}</button><div id="site-cases" class="site-submenu" hidden><a href="${url('cases/')}">전체 사례</a>${caseSubjects.map(b => `<a href="${url(`cases/${b.id}/`)}">${b.id} ${b.title}</a>`).join('')}</div></div></nav>`;
document.body.prepend(bar);
initializeTts(bar.querySelector('#site-tts-toggle'));
const toggle = bar.querySelector('.site-toggle');
const groups = [...bar.querySelectorAll('.site-group > button')];
function closeGroups() {
  for (const button of groups) {
    button.setAttribute('aria-expanded', 'false');
    document.getElementById(button.getAttribute('aria-controls')).hidden = true;
  }
}
function closeAll() {
  closeGroups();
  toggle.setAttribute('aria-expanded', 'false');
  bar.classList.remove('site-open');
}
toggle.onclick = () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  closeAll();
  toggle.setAttribute('aria-expanded', String(open));
  bar.classList.toggle('site-open', open);
};
for (const button of groups) {
  button.onclick = () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    closeGroups();
    button.setAttribute('aria-expanded', String(open));
    document.getElementById(button.getAttribute('aria-controls')).hidden = !open;
  };
  button.onkeydown = event => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      closeGroups();
      button.setAttribute('aria-expanded', 'true');
      const panel = document.getElementById(button.getAttribute('aria-controls'));
      panel.hidden = false;
      panel.querySelector('a').focus();
    }
  };
}
bar.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  event.stopPropagation();
  const active = groups.find(b => b.getAttribute('aria-expanded') === 'true');
  if (active) { closeGroups(); active.focus(); }
  else { closeAll(); toggle.focus(); }
});
document.addEventListener('click', event => { if (!bar.contains(event.target)) closeAll(); });
bar.addEventListener('focusout', event => {
  if (event.relatedTarget && !bar.contains(event.relatedTarget)) closeAll();
});
matchMedia('(max-width: 760px)').addEventListener('change', closeAll);
function currentPage() {
  let path = location.pathname.replace(/index\.html$/, '').replace(/\/$/, '');
  const relative = path.slice(root.pathname.length);
  if (relative === 'exam') path = new URL('info', root).pathname;
  if (relative === 'output/markdown') path = new URL('textbook', root).pathname;
  if (relative === 'viewer' || relative === 'output/markdown/reader.html') {
    path = new URL(`textbook/${new URLSearchParams(location.search).get('book') || '05'}`, root).pathname;
  }
  for (const a of bar.querySelectorAll('a')) {
    const linkPath = new URL(a.href).pathname.replace(/\/$/, '');
    const current = linkPath === path || (caseSubjects.some(b => linkPath === new URL(`cases/${b.id}`, root).pathname) && path.startsWith(linkPath + '/'));
    if (current) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  for (const button of groups) button.classList.toggle('site-active', !!button.parentElement.querySelector('[aria-current="page"]'));
}
currentPage();
addEventListener('popstate', currentPage);
addEventListener('site-route-change', currentPage);
