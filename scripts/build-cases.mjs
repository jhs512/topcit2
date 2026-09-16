import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseCases, renderCase, renderMarkdown } from './case-schema.mjs';
import { books } from '../output/markdown/books.mjs';


const root = new URL('../', import.meta.url);
const source = await readFile(new URL('reading/it-business-stories.md', root), 'utf8');
const { cases, closing } = parseCases(source, 'reading/it-business-stories.md');
// Validate every basis before writing any generated page.
const bookSources = new Map();
for (const c of cases) {
  const [, id, page] = c.lesson.basis.url.match(/textbook\/(\d{2})\/#page-(\d{3})$/);
  const book = books.find(b => b.id === id);
  if (!bookSources.has(id)) bookSources.set(id, await readFile(new URL(book.source, new URL('output/markdown/', root)), 'utf8'));
  const content = bookSources.get(id).split(`<!-- PDF page: ${page} -->`)[1]?.split('<!-- PDF page:')[0];
  if (!content?.trim()) throw new Error(`reading/it-business-stories.md [${c.id}]: 근거 페이지 ${id}/${page}가 교재 원본에 없습니다`);
}
const esc = text => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const actual = cases.filter(c => c.type.startsWith('실제')).length;
const counts = `총 ${cases.length}편 · 실제 ${actual}편 · 가상 ${cases.length - actual}편`;
const subject = 'IT비즈니스와 윤리';
function page(title, depth, body) {
  const prefix = '../'.repeat(depth);
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · TOPCIT 사례 모음</title><link rel="stylesheet" href="${prefix}practice/styles.css"><link rel="stylesheet" href="${prefix}shared/site-navigation.css"><link rel="stylesheet" href="${prefix}cases/styles.css"><script type="module" src="${prefix}shared/site-navigation.mjs"></script></head><body><main>${body}</main></body></html>\n`;
}
async function save(path, html) {
  const url = new URL(path, root);
  await mkdir(fileURLToPath(new URL('./', url)), { recursive: true });
  await writeFile(url, html);
}
await save('cases/index.html', page('과목 선택', 1, `<nav class="breadcrumbs" aria-label="현재 위치"><a href="../">홈</a><span>사례 모음</span></nav><section class="intro"><div class="eyebrow">TOPCIT · 사례 모음</div><h1 >어떤 과목을 읽을까요?</h1><p >사례 속 결정과 결과를 따라가며 교재 개념을 이해하세요.</p></section><div class="area-grid"><a class="area-card" href="05/"><div class="card-top">교재 05 · ${counts}</div><h2 >${subject}</h2><p >프로그램이 잘 돌아가는데, 회사는 왜 힘들까?</p><span class="card-action">사례 목록 보기 →</span></a></div><p class="availability">현재 읽을 수 있는 과목은 ${subject}입니다.</p>`));
await save('cases/05/index.html', page(subject, 2, `<nav class="breadcrumbs" aria-label="현재 위치"><a href="../../">홈</a><a href="../">사례 모음</a><span>${subject}</span></nav><section class="intro"><div class="eyebrow">교재 05 · ${counts}</div><h1 >${subject}</h1><p >프로그램이 잘 돌아가는데, 회사는 왜 힘들까?</p><p >실제 사례는 공개 기록을 바탕으로, 가상 사례는 개념을 설명하기 위한 설정으로 작성했습니다.</p></section><div class="case-list">${cases.map(c => `<a class="area-card" href="${c.id}/"><div class="card-top">${c.id} · ${esc(c.type)}</div><h2 >${esc(c.title)}</h2><p class="concept">${esc(c.concept)}</p><p class="lesson">${esc(c.lesson.concrete)}</p><span class="card-action">이야기 읽기 →</span></a>`).join('')}</div>${closing ? '<section class="series-closing">' + renderMarkdown(closing) + '</section>' : ''}`));
for (const [i, c] of cases.entries()) {
  const rendered = renderCase(c);
  await save(`cases/05/${c.id}/index.html`, page(c.title, 3, `<nav class="breadcrumbs" aria-label="현재 위치"><a href="../../../">홈</a><a href="../../">사례 모음</a><a href="../">${subject}</a><span>${c.id}</span></nav><article class="story" data-tts-content><header><div class="eyebrow">${subject} · ${c.id}</div><h1 class="tts-readable">${esc(c.title)}</h1></header>${rendered.story}</article>${rendered.references}<nav class="story-navigation" aria-label="사례 이동">${i > 0 ? `<a href="../${cases[i - 1].id}/">← 이전 사례<span>${esc(cases[i - 1].title)}</span></a>` : '<span></span>'}<a href="../">사례 목록</a>${i < cases.length - 1 ? `<a href="../${cases[i + 1].id}/">다음 사례 →<span>${esc(cases[i + 1].title)}</span></a>` : '<span></span>'}</nav>`));
}
console.log(`Built cases: ${counts} (Markdown source: reading/it-business-stories.md)`);
