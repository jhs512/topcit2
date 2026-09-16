import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseCases, renderCase, renderMarkdown } from './case-schema.mjs';
import { books } from '../output/markdown/books.mjs';
import { learningSubjects } from '../shared/learning-subjects.mjs';
import { caseSubjects } from '../reading/case-subjects.mjs';
import { redirectPage } from './page-redirect.mjs';

const root = new URL('../', import.meta.url);
const source = await readFile(new URL('reading/it-business-stories.md', root), 'utf8');
const { cases, closing } = parseCases(source, 'reading/it-business-stories.md');
const bookSources = new Map();
for (const c of cases) {
  if (!learningSubjects.some(s => s.id === caseSubjects[c.id])) throw new Error(`${c.id}: reading/case-subjects.mjs의 주제 분류가 필요합니다.`);
  const [, id, page] = c.lesson.basis.url.match(/textbook\/(\d{2})\/#page-(\d{3})$/);
  const book = books.find(b => b.id === id);
  if (!bookSources.has(id)) bookSources.set(id, await readFile(new URL(book.source, new URL('output/markdown/', root)), 'utf8'));
  const content = bookSources.get(id).split(`<!-- PDF page: ${page} -->`)[1]?.split('<!-- PDF page:')[0];
  if (!content?.trim()) throw new Error(`reading/it-business-stories.md [${c.id}]: 근거 페이지 ${id}/${page}가 교재 원본에 없습니다`);
}
for (const id of Object.keys(caseSubjects)) if (!cases.some(c => c.id === id)) throw new Error(`${id}: 분류에 대응하는 사례가 없습니다.`);
const esc = text => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const counts = items => {
  const actual = items.filter(c => c.type.startsWith('실제')).length;
  return `총 ${items.length}편 · 실제 ${actual}편 · 가상 ${items.length - actual}편`;
};
function page(title, depth, body) {
  const prefix = '../'.repeat(depth);
  return `<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · TOPCIT 사례 모음</title><link rel="stylesheet" href="${prefix}practice/styles.css"><link rel="stylesheet" href="${prefix}shared/site-navigation.css"><link rel="stylesheet" href="${prefix}cases/styles.css"><script type="module" src="${prefix}shared/site-navigation.mjs"></script></head><body><a class="skip" href="#main">본문으로 바로가기</a><main id="main">${body}</main></body></html>\n`;
}
async function save(path, html) {
  const url = new URL(path, root);
  await mkdir(fileURLToPath(new URL('./', url)), { recursive: true });
  await writeFile(url, html);
}
const grouped = new Map(learningSubjects.map(s => [s.id, cases.filter(c => caseSubjects[c.id] === s.id)]));
await save('cases/index.html', page('주제 선택', 1, `<nav class="breadcrumbs" aria-label="현재 위치"><a href="../">홈</a><span>사례 모음</span></nav><section class="intro"><div class="eyebrow">TOPCIT · 사례 모음</div><h1>어떤 주제를 읽을까요?</h1><p>여덟 주제의 사례와 교훈을 살펴보세요.</p></section><div class="area-grid">${learningSubjects.map(s => `<a class="area-card" href="${s.id}/"><div class="card-top">${s.id} · ${grouped.get(s.id).length ? counts(grouped.get(s.id)) : '사례 준비 중'}</div><h2>${s.title}</h2><p>${s.description}</p><span class="card-action">사례 목록 보기 →</span></a>`).join('')}</div>`));
for (const s of learningSubjects) {
  const items = grouped.get(s.id);
  await save(`cases/${s.id}/index.html`, page(s.title, 2, `<nav class="breadcrumbs" aria-label="현재 위치"><a href="../../">홈</a><a href="../">사례 모음</a><span>${s.id} ${s.title}</span></nav><section class="intro"><div class="eyebrow">${s.id} · ${counts(items)}</div><h1>${s.title}</h1><p>${items.length ? '실제 사례는 공개 기록을 바탕으로, 가상 사례는 개념을 설명하기 위한 설정으로 작성했습니다.' : '이 주제의 사례를 준비 중입니다.'}</p></section><div class="case-list">${items.map(c => `<a class="area-card" href="${c.id}/"><div class="card-top">${c.id} · ${esc(c.type)}</div><h2>${esc(c.title)}</h2><p class="concept">${esc(c.concept)}</p><p class="lesson">${esc(c.lesson.concrete)}</p><span class="card-action">이야기 읽기 →</span></a>`).join('')}</div>${s.id === '05-01' && closing ? '<section class="series-closing">' + renderMarkdown(closing) + '</section>' : ''}`));
  for (const [i, c] of items.entries()) {
    const rendered = renderCase(c);
    await save(`cases/${s.id}/${c.id}/index.html`, page(c.title, 3, `<nav class="breadcrumbs" aria-label="현재 위치"><a href="../../../">홈</a><a href="../../">사례 모음</a><a href="../">${s.id} ${s.title}</a><span>${c.id}</span></nav><article class="story" data-tts-content><header><div class="eyebrow">${s.title} · ${c.id}</div><h1 class="tts-readable">${esc(c.title)}</h1></header>${rendered.story}</article>${rendered.references}<nav class="story-navigation" aria-label="사례 이동">${i > 0 ? `<a href="../${items[i - 1].id}/">← 이전 사례<span>${esc(items[i - 1].title)}</span></a>` : '<span></span>'}<a href="../">사례 목록</a>${i < items.length - 1 ? `<a href="../${items[i + 1].id}/">다음 사례 →<span>${esc(items[i + 1].title)}</span></a>` : '<span></span>'}</nav>`));
    await save(`cases/05/${c.id}/index.html`, redirectPage(`../../${s.id}/${c.id}/`, esc(c.title)));
  }
}
await save('cases/05/index.html', redirectPage('../05-01/', 'IT 비즈니스 사례 모음'));
await save('shared/case-catalog.mjs', `// Generated by scripts/build-cases.mjs. 모든 주제와 준비 상태.\nexport const caseSubjects = ${JSON.stringify(learningSubjects.map(s => ({id:s.id,title:s.title,count:grouped.get(s.id).length})), null, 2)};\n`);
console.log(`Built cases: ${counts(cases)} · 8 subjects`);
