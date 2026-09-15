import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const root = new URL('../', import.meta.url);
const source = await readFile(new URL('reading/it-business-stories.md', root), 'utf8');
if (/https:\/\/jhs512\.github\.io\/topcit2?\/(?:viewer\/|sources\/)/.test(source)) {
  throw new Error('Textbook references must use the HTML reader: /topcit2/textbook/NN/#page-NNN');
}
const headings = [...source.matchAll(/^## (BIZ-\d{2}) · (.+)$/gm)];
const esc = text => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cases = headings.map((match, i) => {
  const body = source.slice(match.index + match[0].length, headings[i + 1]?.index ?? source.length).trim();
  const type = body.match(/^\*([^*]+)\*/)?.[1];
  const lesson = body.match(/^> \*\*(.+)\*\*$/m)?.[1];
  const concept = body.match(/^교재 개념: \*\*(.+)\*\*$/m)?.[1];
  if (!type || !lesson || !concept) throw new Error(`Missing case metadata: ${match[1]}`);
  return { id: match[1], title: match[2], body, type, lesson, concept };
});
if (!cases.length || new Set(cases.map(c => c.id)).size !== cases.length) throw new Error('Empty or duplicate cases');
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
await save('cases/index.html', page('과목 선택', 1, `<nav class="breadcrumbs" aria-label="현재 위치"><a href="../">홈</a><span>사례 모음</span></nav><section class="intro"><div class="eyebrow">TOPCIT · 사례 모음</div><h1>어떤 과목을 읽을까요?</h1><p>사례 속 결정과 결과를 따라가며 교재 개념을 이해하세요.</p></section><div class="area-grid"><a class="area-card" href="05/"><div class="card-top">교재 05 · ${counts}</div><h2>${subject}</h2><p>프로그램이 잘 돌아가는데, 회사는 왜 힘들까?</p><span class="card-action">사례 목록 보기 →</span></a></div><p class="availability">현재 읽을 수 있는 과목은 ${subject}입니다.</p>`));
await save('cases/05/index.html', page(subject, 2, `<nav class="breadcrumbs" aria-label="현재 위치"><a href="../../">홈</a><a href="../">사례 모음</a><span>${subject}</span></nav><section class="intro"><div class="eyebrow">교재 05 · ${counts}</div><h1>${subject}</h1><p>프로그램이 잘 돌아가는데, 회사는 왜 힘들까?</p><p>실제 사례는 공개 기록을 바탕으로, 가상 사례는 개념을 설명하기 위한 설정으로 작성했습니다.</p></section><div class="case-list">${cases.map(c => `<a class="area-card" href="${c.id}/"><div class="card-top">${c.id} · ${esc(c.type)}</div><h2>${esc(c.title)}</h2><p class="concept">${esc(c.concept)}</p><p class="lesson">${esc(c.lesson)}</p><span class="card-action">이야기 읽기 →</span></a>`).join('')}</div>`));
for (const [i, c] of cases.entries()) {
  await save(`cases/05/${c.id}/index.html`, page(c.title, 3, `<nav class="breadcrumbs" aria-label="현재 위치"><a href="../../../">홈</a><a href="../../">사례 모음</a><a href="../">${subject}</a><span>${c.id}</span></nav><article class="story"><header><div class="eyebrow">${subject} · ${c.id}</div><h1>${esc(c.title)}</h1></header>${marked.parse(c.body)}</article><nav class="story-navigation" aria-label="사례 이동">${i > 0 ? `<a href="../${cases[i - 1].id}/">← 이전 사례<span>${esc(cases[i - 1].title)}</span></a>` : '<span></span>'}<a href="../">사례 목록</a>${i < cases.length - 1 ? `<a href="../${cases[i + 1].id}/">다음 사례 →<span>${esc(cases[i + 1].title)}</span></a>` : '<span></span>'}</nav>`));
}
console.log(`Built cases: ${counts} (Markdown source: reading/it-business-stories.md)`);
