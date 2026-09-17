import { caseRows } from '../reading/expanded-cases.mjs';
import { subjects } from '../practical/content.mjs';
import { parseCases } from './case-schema.mjs';
import { readFileSync } from 'node:fs';

const lessons = JSON.parse(readFileSync(new URL('../reading/case-lessons.json', import.meta.url), 'utf8'));

const prefixes = {'01':'SW','02':'DATA','03':'ARCH','04':'SEC','05-01':'BIZ','05-02':'ETH','06-01':'PM','06-02':'COM'};
export function expandedCaseSources() {
  return subjects.map(subject => {
    const rows = caseRows[subject.id]?.trim().split('\n').map(row => row.split('|'));
    const expected = subject.id === '05-01' ? 9 : 20;
    if (rows?.length !== expected || rows.some(row => row.length !== 4 || row.some(part => !part.trim()))) throw new Error(`${subject.id}: 사례 원고 ${expected}편의 제목·상황·행동·결과가 필요합니다.`);
    const segments = rows.map(([title, situation, action, outcome], index) => {
      const number = index + (subject.id === '05-01' ? 12 : 1);
      const [concept] = subject.items[number - 1];
      const id = `${prefixes[subject.id]}-${String(number).padStart(2,'0')}`;
      const lesson = lessons[id];
      if (!lesson?.principle?.trim() || !lesson?.application?.trim()) throw new Error(`${id}: 사례 교훈의 원리와 적용 설명이 필요합니다.`);
      return `## ${id} · ${title}\n유형: 가상 이야기 · 핵심노트 기반\n핵심노트 개념: ${concept}\n\n### 이 글에서 배우는 교훈\n추상적인 문장: ${lesson.principle}\n근거: [${concept} · 핵심노트 ${number}](https://jhs512.github.io/topcit2/practical/${subject.id}/#concept-${number})\n구체적인 문장: ${lesson.application}\n\n### 본문\n${situation}\n\n${action}\n\n### 결론\n${outcome}\n`;
    });
    const source = `<!-- case-schema: 2 -->\n# ${subject.title} · 핵심노트 기반 가상 사례\n\n${segments.join('\n')}`;
    const path = `reading/cases/${subject.id}.md`;
    return { subjectId: subject.id, path, source, cases: parseCases(source,path).cases };
  });
}
