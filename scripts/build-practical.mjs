import { mkdir, writeFile } from 'node:fs/promises';
import { subjects, references } from '../practical/content.mjs';
import { redirectPage } from './page-redirect.mjs';

const root = new URL('../practical/', import.meta.url);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const note = '교재의 목차나 시험 중요도 순위를 따르지 않고, 실무에서 먼저 생각할 개념을 자체 선정한 해설입니다. 개념의 순서는 이 글의 판단이며 업무와 조직에 따라 우선순위는 달라질 수 있습니다. 예시는 이해를 돕기 위한 가상 상황입니다.';
const document = (title, prefix, body) => `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · 실무 관점 · TOPCIT</title><link rel="stylesheet" href="${prefix}practice/styles.css"><link rel="stylesheet" href="${prefix}practical/styles.css"><link rel="stylesheet" href="${prefix}shared/site-navigation.css"><script type="module" src="${prefix}shared/site-navigation.mjs"></script></head><body><a class="skip" href="#main">본문으로 바로가기</a><main id="main">${body}</main></body></html>\n`;

if (subjects.length !== 8 || new Set(subjects.map(s => s.id)).size !== 8) throw new Error('실무 관점은 중복 없는 여덟 주제여야 합니다.');
for (const subject of subjects) {
  if (subject.items.length !== 10 || subject.items.some(item => item.length !== 4 || item.some(text => !text?.trim()))) throw new Error(`${subject.id}: 개념 열 개와 설명·예시·질문을 확인하세요.`);
}
await writeFile(new URL('index.html', root), document('전체', '../', `<header class="intro"><div class="eyebrow">현장에서 생각하고 판단하기</div><h1>실무 관점</h1><p>여덟 주제 · 주제별 핵심 개념 10개 · 총 80개</p><p class="editor-note">${note}</p></header><div class="area-grid">${subjects.map(s => `<a class="area-card" href="${s.id}/"><div class="eyebrow">주제 ${s.id} · 핵심 개념 10개</div><h2>${escape(s.title)}</h2><p>${escape(s.intro)}</p><span class="card-action">실무 관점 읽기 →</span></a>`).join('')}</div>`));
for (const s of subjects) {
  const article = s.items.map(([title, explanation, example, question], i) => `<article class="concept" id="concept-${i + 1}" data-tts-content><h2 class="tts-readable">${i + 1}. ${escape(title)}</h2><p class="tts-readable">${escape(explanation)}</p><section class="example"><h3>가상 업무 예시</h3><p class="tts-readable">${escape(example)}</p></section><p class="check tts-readable"><strong>현장에서 확인할 질문</strong><br>${escape(question)}</p><a class="to-contents" href="#contents">목차로 ↑</a></article>`).join('\n');
  const body = `<a href="../">← 전체 실무 관점</a><header class="intro"><div class="eyebrow">실무 관점 · 주제 ${s.id}</div><h1>${escape(s.title)}</h1><p>${escape(s.intro)}</p><p class="editor-note">${note}</p></header><nav class="contents" id="contents" aria-label="핵심 개념 목차"><h2>먼저 생각할 열 가지</h2><ol>${s.items.map(([title], i) => `<li><a href="#concept-${i + 1}">${escape(title)}</a></li>`).join('')}</ol></nav><div class="concepts">${article}</div><aside class="references"><h2>더 읽어 보기</h2><p>아래 자료는 관련 원칙을 더 살펴보는 참고 자료입니다. 이 글의 열 개 선정이나 순위를 제시한 자료는 아닙니다.</p><ul>${references[s.id].map(([label, url]) => `<li><a href="${escape(url)}">${escape(label)}</a></li>`).join('')}</ul></aside><nav class="subject-links" aria-label="다른 주제의 실무 관점">${subjects.filter(other => other.id !== s.id).map(other => `<a href="../${other.id}/">${escape(other.title)}</a>`).join('')}</nav>`;
  await mkdir(new URL(`${s.id}/`, root), { recursive: true });
  await writeFile(new URL(`${s.id}/index.html`, root), document(s.title, '../../', body));
}
for (const [oldId, id] of [['05','05-01'],['06','06-01']]) await writeFile(new URL(`${oldId}/index.html`, root), redirectPage(`../${id}/`, '실무 관점 읽기'));
console.log('실무 관점: 8개 주제 · 80개 개념 생성');
