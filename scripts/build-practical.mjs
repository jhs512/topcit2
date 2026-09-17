import { mkdir, writeFile } from 'node:fs/promises';
import { subjects, references } from '../practical/content.mjs';
import { subjectIntroductions } from '../practical/subject-introductions.mjs';
import { redirectPage } from './page-redirect.mjs';
import { alignment, renderTextbookConnection, renderStudyPaths, validateTextbookAlignment } from '../shared/textbook-alignment.mjs';

validateTextbookAlignment();

const root = new URL('../practical/', import.meta.url);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const note = '교재 개념의 뜻을 설명하고, 가상 업무에서 언제 왜 쓰는지 풀어 쓴 자체 해설입니다. 각 항목의 관련 교재 내용에서 단원과 교재 페이지를 확인할 수 있습니다. 20개 노트는 교재 전체 요약이나 시험 중요도 순위가 아니며, 주제 끝의 추가 학습 내용도 함께 확인하세요.';
const document = (title, prefix, body) => `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · 핵심노트 · TOPCIT</title><link rel="stylesheet" href="${prefix}practice/styles.css"><link rel="stylesheet" href="${prefix}practical/styles.css"><link rel="stylesheet" href="${prefix}shared/site-navigation.css"><script type="module" src="${prefix}shared/site-navigation.mjs"></script></head><body><a class="skip" href="#main">본문으로 바로가기</a><main id="main">${body}</main></body></html>\n`;

if (subjects.length !== 8 || new Set(subjects.map(s => s.id)).size !== 8) throw new Error('핵심노트는 중복 없는 여덟 주제여야 합니다.');
for (const subject of subjects) {
  if (subject.items.length < 20 || subject.items.some(item => item.length !== 4 || item.some(text => !text?.trim()))) throw new Error(`${subject.id}: 개념 스무 개 이상 및 설명·예시·질문을 확인하세요.`);
}
await writeFile(new URL('index.html', root), document('전체', '../', `<header class="intro"><div class="eyebrow">현장에서 생각하고 판단하기</div><h1>핵심노트</h1><p>여덟 주제 · 주제별 핵심 개념 20개 이상 · 총 ${subjects.reduce((n,s)=>n+s.items.length,0)}개</p><p class="editor-note">${note}</p></header><div class="area-grid">${subjects.map(s => `<a class="area-card" href="${s.id}/"><div class="eyebrow">주제 ${s.id} · 핵심 개념 ${s.items.length}개</div><h2>${escape(s.title)}</h2><p>${escape(s.intro)}</p><span class="card-action">핵심노트 읽기 →</span></a>`).join('')}</div>`));
for (const s of subjects) {
  const article = s.items.map(([title, explanation, example, question], i) => `<article class="concept" id="concept-${i + 1}" data-tts-content><h2 class="tts-readable">${i + 1}. ${escape(title)}</h2><p class="tts-readable">${escape(explanation)}</p><section class="example"><h3>가상 업무 예시</h3><p class="tts-readable">${escape(example)}</p></section><p class="check tts-readable"><strong>생각해 볼 질문</strong><br>${escape(question)}</p>${renderTextbookConnection(alignment[s.id][i], `concept-${i + 1}`)}<a class="to-contents" href="#contents">목차로 ↑</a></article>`).join('\n');
  const introduction = subjectIntroductions[s.id];
  if (!introduction?.what?.trim() || !introduction?.why?.trim()) throw new Error(`${s.id}: 과목 도입 설명을 확인하세요.`);
  const overview = `<section class="subject-overview" aria-label="과목 이해하기" data-tts-content><h2 class="tts-readable">이게 뭔가요?</h2><p class="tts-readable">${escape(introduction.what)}</p><h2 class="tts-readable">왜 배우나요?</h2><p class="tts-readable">${escape(introduction.why)}</p></section>`;
  const body = `<a href="../">← 전체 핵심노트</a><header class="intro"><div class="eyebrow">핵심노트 · 주제 ${s.id}</div><h1>${escape(s.title)}</h1></header>${overview}<div class="intro"><p>${escape(s.intro)}</p><p class="editor-note">${note}</p></div><nav class="contents" id="contents" aria-label="핵심 개념 목차"><h2>핵심 개념 ${s.items.length}가지</h2><ol>${s.items.map(([title], i) => `<li><a href="#concept-${i + 1}">${escape(title)}</a></li>`).join('')}</ol></nav><div class="concepts">${article}</div>${renderStudyPaths(s.id)}<aside class="references"><h2>더 읽어 보기</h2><p><a href="../../cases/${s.id}/">이 과목의 사례 20편으로 적용해 보기 →</a></p><p>아래 자료는 관련 원칙을 더 살펴보는 참고 자료입니다. 이 글의 개념 선정이나 순위를 제시한 자료는 아닙니다.</p><ul>${references[s.id].map(([label, url]) => `<li><a href="${escape(url)}">${escape(label)}</a></li>`).join('')}</ul></aside><nav class="subject-links" aria-label="다른 주제의 핵심노트">${subjects.filter(other => other.id !== s.id).map(other => `<a href="../${other.id}/">${escape(other.title)}</a>`).join('')}</nav>`;
  await mkdir(new URL(`${s.id}/`, root), { recursive: true });
  await writeFile(new URL(`${s.id}/index.html`, root), document(s.title, '../../', body));
}
for (const [oldId, id] of [['05','05-01'],['06','06-01']]) await writeFile(new URL(`${oldId}/index.html`, root), redirectPage(`../${id}/`, '핵심노트 읽기'));
console.log('핵심노트: 8개 주제 · 160개 개념 생성');
