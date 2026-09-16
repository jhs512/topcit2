import { bindThemeButton } from './theme.mjs';
import { learningSubjects } from './learning-subjects.mjs';
import { books } from '../output/markdown/books.mjs';
import { initializeTts } from './speech-loader.mjs?v=20260917-pronunciation';

const root = new URL('../', import.meta.url);
const url = path => new URL(path, root).href;
const arrow = '<svg class="site-chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const subjectMenu = section => learningSubjects.map(s => `<a href="${url(section + '/' + s.id + '/')}">${s.id} ${s.title}</a>`).join('');
const bar = document.createElement('div');
bar.id = 'site-navigation';
bar.innerHTML = `<a class="site-brand" href="${url('')}">TOPCIT</a><button type="button" id="site-theme-toggle" aria-label="다크모드로 전환" aria-pressed="false">다크</button><button type="button" id="site-tts-toggle" aria-pressed="false">TTS 꺼짐</button><button class="site-toggle" aria-expanded="false" aria-controls="site-links">메뉴 <span aria-hidden="true">☰</span></button><nav id="site-links" aria-label="사이트 주 메뉴"><div class="site-group"><button aria-expanded="false" aria-controls="site-textbooks"><span>교재</span>${arrow}</button><div id="site-textbooks" class="site-submenu" hidden><a href="${url('textbook/')}">전체 교재</a>${books.map(b => `<a href="${url(`textbook/${b.id}/`)}">${b.id} ${b.title}</a>`).join('')}</div></div><div class="site-group"><button aria-expanded="false" aria-controls="site-practice"><span>문제</span>${arrow}</button><div id="site-practice" class="site-submenu" hidden><a href="${url('practice/')}">전체 문제</a>${subjectMenu('practice')}</div></div><a href="${url('info/')}">시험 안내</a><a href="${url('syllabus/')}">출제기준</a><div class="site-group"><button aria-expanded="false" aria-controls="site-practical"><span>핵심노트</span>${arrow}</button><div id="site-practical" class="site-submenu" hidden><a href="${url('practical/')}">전체 핵심노트</a>${subjectMenu('practical')}</div></div><div class="site-group"><button aria-expanded="false" aria-controls="site-cases"><span>사례 모음</span>${arrow}</button><div id="site-cases" class="site-submenu" hidden><a href="${url('cases/')}">전체 사례</a>${subjectMenu('cases')}</div></div><a href="${url('study/')}">학습방법</a><a href="${url('instructor/')}">강사소개</a></nav>`;
// Only pages that explicitly opt in open navigation destinations in a new tab.
if (document.body.dataset.pageLinks === 'new-tab') {
  for (const link of bar.querySelectorAll('a[href]')) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
}
document.body.prepend(bar);
bindThemeButton(bar.querySelector('#site-theme-toggle'));
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
matchMedia('(max-width: 1240px)').addEventListener('change', closeAll);
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
    const current = linkPath === path;
    const parent = learningSubjects.some(s => linkPath === new URL(`cases/${s.id}`, root).pathname) && path.startsWith(linkPath + '/');
    a.classList.toggle('site-parent-active', parent);
    if (current) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  for (const button of groups) button.classList.toggle('site-active', !!button.parentElement.querySelector('[aria-current="page"],.site-parent-active'));
}
currentPage();
addEventListener('popstate', currentPage);
addEventListener('site-route-change', currentPage);
