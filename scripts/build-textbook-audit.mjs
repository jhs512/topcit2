// node scripts/build-textbook-audit.mjs [comparison commit]
// TOPCIT_SOURCE_ROOT may point to another checkout containing the verified six-book catalog.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { subjects } from '../practical/content.mjs';
import { caseRows } from '../reading/expanded-cases.mjs';
import { parseCases } from './case-schema.mjs';
import { expandedCaseSources } from './expanded-case-source.mjs';
import { alignment, legacyCaseAlignment, studyPaths, caseAlignment, textbookTitle, textbookUrl, validateTextbookAlignment } from '../shared/textbook-alignment.mjs';

validateTextbookAlignment();
const root = new URL('../', import.meta.url);
const baseline = process.argv[2] || '8bb03fdf4e03229ffac6d9de1a48f77523b0b549';
const previous = path => execFileSync('git', ['show', `${baseline}:${path}`], { cwd: fileURLToPath(root), encoding: 'utf8' });
const originalModule = async path => {
  const code = previous(path).replace(/from (['"])(\.\.?\/[^'"]+)\1/g, (_, quote, relative) => `from ${quote}${new URL(relative, new URL(path, root)).href}${quote}`);
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
};
const oldSubjects = (await originalModule('practical/content.mjs')).subjects;
const oldRows = (await originalModule('reading/expanded-cases.mjs')).caseRows;
const original = parseCases(readFileSync(new URL('reading/it-business-stories.md', root), 'utf8')).cases;
const oldOriginal = parseCases(previous('reading/it-business-stories.md')).cases;
for (let i = 0; i < original.length; i++) {
  const a = original[i], b = oldOriginal[i];
  for (const key of ['id', 'title', 'type', 'concept', 'body', 'introduction', 'conclusion']) if (a[key] !== b[key]) throw new Error(`${a.id}: 기존 원고 ${key} 변경 확인 필요`);
  const external = c => c.referenceItems.filter(r => !r.url.startsWith('https://jhs512.github.io/'));
  if (JSON.stringify(external(a)) !== JSON.stringify(external(b))) throw new Error(`${a.id}: 실제 사건 외부 근거 변경`);
}
const changes = new Map();
for (const subject of subjects) {
  const rows = caseRows[subject.id].trim().split('\n');
  const old = oldRows[subject.id].trim().split('\n');
  for (let i = 0; i < rows.length; i++) if (rows[i] !== old[i]) changes.set(`${subject.id}/${i + (subject.id === '05-01' ? 12 : 1)}`, { before: old[i].split('|'), after: rows[i].split('|') });
}
const modifiedTitles = subjects.reduce((n, s) => n + s.items.filter((item, i) => item[0] !== oldSubjects.find(o => o.id === s.id).items[i][0]).length, 0);
const modifiedBodies = subjects.reduce((n, s) => n + s.items.filter((item, i) => item[1] !== oldSubjects.find(o => o.id === s.id).items[i][1]).length, 0);
const allRecords = [...Object.values(alignment).flat(), ...Object.values(legacyCaseAlignment), ...Object.values(studyPaths).flat()];
const sourceRoot = pathToFileURL(resolve(process.env.TOPCIT_SOURCE_ROOT || fileURLToPath(new URL('../topcit/', root)), 'output/markdown') + '/');
const catalog = (await import(new URL('books.mjs', sourceRoot).href)).books;
const evidence = [];
for (const book of catalog) {
  const source = readFileSync(new URL(book.source, sourceRoot), 'utf8');
  const local = readFileSync(new URL(`output/markdown/${book.source}`, root), 'utf8');
  for (const page of [...new Set(allRecords.filter(r => r.book === book.id).map(r => r.page))].sort((a, b) => a - b)) {
    const marker = `<!-- PDF page: ${String(page).padStart(3, '0')} -->`;
    const body = source.split(marker)[1]?.split('<!-- PDF page:')[0].trim();
    const localBody = local.split(marker)[1]?.split('<!-- PDF page:')[0].trim();
    if (!body || body !== localBody) throw new Error(`원본 대조 필요 ${book.id}/${page}`);
    evidence.push({ book: book.id, page, source: book.source, sha256: createHash('sha256').update(body).digest('hex') });
  }
}
writeFileSync(new URL('docs/textbook-page-evidence.json', root), JSON.stringify({ sourceCatalog: 'topcit/output/markdown/books.mjs', comparisonCommit: baseline, pages: evidence }, null, 2) + '\n');
const cell = text => String(text).replaceAll('|', '\\|').replaceAll('\n', ' ');
const lines = [
  '# 핵심노트·사례 교재 정합성 점검표', '',
  `비교 기준: \`${baseline}\`. 2026-09-16 점검. 계획: [전체 보완 계획](2026-09-16-152712-textbook-alignment-plan.md).`, '',
  `여덟 주제의 핵심노트 160개와 사례 160편을 대조했다. 노트 본문 ${modifiedBodies}개 보강, 제목 ${modifiedTitles}개 수정, 가상 사례 ${changes.size}편 수정. 기존 비즈니스 11편의 본문·결론과 실제 사례 4편의 외부 근거는 유지했다. 추가 학습 설명·질문은 35개다.`, '',
  '## 확인 범위와 한계', '',
  '- 여섯 교재의 목차·학습목표와 항목별 관련 단원 본문을 읽었다. 전체 교재 모든 문장을 정독했다는 뜻은 아니다.',
  '- 기준 원본은 topcit/output/markdown/books.mjs의 source이다. 특히 교재 05는 IT비즈니스와윤리.md를 사용했다.',
  `- 선택한 ${evidence.length}개 고유 근거 페이지가 기준 원본과 TOPCIT2 사본에서 같은지 대조했다. [페이지별 해시](textbook-page-evidence.json)는 이후 변경 여부를 추적하는 기록이며, 의미 정합성을 자동으로 증명하지는 않는다.`,
  '- PDF 02의 72쪽(정규화), 05의 207쪽(AI 윤리 원칙), 06의 110쪽(획득가치 표)을 원본 이미지로 대조했다. 원본 표의 단위·번역상 혼동을 복제하지 않고 획득가치를 금액 예시로 설명했다.',
  '- 원문 인용과 자체 해설을 구분했다. 개인정보·저작권 항목은 교재 원칙의 학습용 설명이며 현재 법의 세부 조항·기간·처벌을 새로 제시하지 않았다.',
  '- 아래 20개씩의 노트는 교재 전체 요약이나 시험 중요도 순위가 아니다. 실무 사례에 드러나지 않는 이론은 추가 학습 경로로 보완했다.', '',
  '## 대표적인 수정 전후', '',
];
for (const [id, number] of [['01',1], ['02',8], ['02',16], ['05-01',11], ['06-01',15]]) {
  const old = oldSubjects.find(s => s.id === id).items[number-1];
  const now = subjects.find(s => s.id === id).items[number-1];
  lines.push(`### 노트 ${id}/${number}`, '', `- 이전: ${old[0]} — ${old[1]}`, `- 보강: ${now[0]} — ${now[1]}`, '');
}
for (const [id, diff] of changes) lines.push(`### 사례 ${id}`, '', `- 이전: ${diff.before.join(' / ')}`, `- 수정: ${diff.after.join(' / ')}`, '');
for (const subject of subjects) {
  lines.push(`## ${subject.id} ${subject.title}`, '', '### 핵심노트 20개', '', '| 노트 | 교재·단원·근거 | 연결 설명 | 본문 보강 |', '| --- | --- | --- | --- |');
  subject.items.forEach((item, i) => {
    const r = alignment[subject.id][i];
    lines.push(`| [${i+1}. ${cell(item[0])}](../practical/${subject.id}/index.html#concept-${i+1}) | ${cell(textbookTitle(r.book))} · ${cell(r.concept)} · [PDF ${r.page}쪽](${textbookUrl(r)}) | ${cell(r.summary)} · ${r.relation} | ${cell(r.core)} |`);
  });
  lines.push('', '### 사례 20편', '', '| 사례 | 교재·단원·근거 | 사례와 연결되는 이유 | 수정 |', '| --- | --- | --- | --- |');
  const cases = [...(subject.id === '05-01' ? original : []), ...expandedCaseSources().find(s => s.subjectId === subject.id).cases];
  cases.forEach(c => {
    const r = caseAlignment(c.id), number = Number(c.id.split('-')[1]);
    lines.push(`| [${c.id} ${cell(c.title)}](../cases/${subject.id}/${c.id}/index.html) | ${cell(textbookTitle(r.book))} · ${cell(r.concept)} · [PDF ${r.page}쪽](${textbookUrl(r)}) | ${cell(r.caseReason)} · ${r.relation} | ${changes.has(`${subject.id}/${number}`) ? '상황·행동/결과 보강 및 근거 표시' : number <= 11 && subject.id === '05-01' ? '본문·외부 근거 유지, 교재 연결 표시' : '노트 기반 교훈 보강 및 교재 연결 표시'} |`);
  });
  lines.push('', '### 추가로 학습할 목표', '');
  for (const r of studyPaths[subject.id]) lines.push(`- **${r.concept}**: ${r.summary} 확인 질문: ${r.question} [${textbookTitle(r.book)} PDF ${r.page}쪽](${textbookUrl(r)})`);
  lines.push('');
}
writeFileSync(new URL('docs/textbook-alignment-audit.md', root), lines.join('\n').trimEnd() + '\n');
console.log(JSON.stringify({ notes: modifiedBodies, titles: modifiedTitles, cases: changes.size, studyPaths: 35, sourcePages: evidence.length, originalCasesPreserved: 11 }));
