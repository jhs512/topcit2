import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseCases, renderCase } from '../scripts/case-schema.mjs';
const sample = `<!-- case-schema: 1 -->
# 사례
## BIZ-01 · 예시
유형: 가상 이야기
교재 개념: 전략
### 이 글에서 배우는 교훈
> **판단의 근거를 확인한다.**
### 본문
담당자는 근거를 확인했다.
### 결론
확인한 근거에 맞춰 결정을 바꿨다.
`;
test('required sections, optional introduction and common conclusion box', () => {
  const without = parseCases(sample).cases[0];
  assert.equal(without.introduction, undefined);
  const withIntro = parseCases(sample.replace('### 본문', '### 들어가기 전에\n용어를 먼저 살펴본다.\n### 본문')).cases[0];
  assert.ok(withIntro.introduction);
  for (const c of [without, withIntro]) {
    const html = renderCase(c).story;
    assert.ok(html.includes('class="case-conclusion '));
    assert.ok(html.indexOf('case-lesson') < html.indexOf('case-body'));
    assert.ok(html.indexOf('case-body') < html.indexOf('case-conclusion'));
  }
});
test('missing, empty, wrong order, duplicated or unknown sections fail with file and ID', () => {
  const invalid = [
    sample.replace('### 이 글에서 배우는 교훈\n> **판단의 근거를 확인한다.**\n', ''),
    sample.replace('### 본문\n담당자는 근거를 확인했다.\n', ''),
    sample.replace('### 결론\n확인한 근거에 맞춰 결정을 바꿨다.\n', ''),
    sample.replace('담당자는 근거를 확인했다.', ''),
    sample.replace('### 본문', '### 결론').replace('### 결론\n확인한', '### 본문\n확인한'),
    sample + '\n### 본문\n중복',
    sample.replace('### 결론', '### 최종 판단'),
    sample.replace('교재 개념: 전략', '유형: 가상 이야기'),
    sample.replace('## BIZ-01 · 예시', '## BIZ-01 예시'),
    sample + sample.slice(sample.indexOf('## BIZ-01')),
  ];
  for (const source of invalid) assert.throws(() => parseCases(source, 'draft.md'), /draft\.md \[BIZ-01\]/);
});
test('all ten originals have the schema and resolvable numbered references', async () => {
  const source = await readFile(new URL('../reading/it-business-stories.md', import.meta.url), 'utf8');
  const { cases, closing } = parseCases(source);
  assert.equal(cases.length, 10);
  assert.equal(cases.filter(c => c.introduction).length, 1);
  assert.equal(cases.filter(c => c.type.startsWith('실제')).length, 3);
  assert.ok(closing.startsWith('열 편에서'));
  for (const c of cases) {
    assert.ok(c.referenceItems.length);
    const rendered = renderCase(c);
    for (const ref of rendered.story.matchAll(/href="#([^"]+)"/g)) assert.ok(rendered.references.includes(`id="${ref[1]}"`));
  }
  assert.throws(() => parseCases(source.replace('#BIZ-01-ref-1', '#BIZ-01-ref-999'), 'draft.md'), /draft\.md \[BIZ-01\].*없는 참고/);
  assert.throws(() => parseCases(source.replace('\n2. [', '\n1. ['), 'draft.md'), /draft\.md \[BIZ-01\].*참고 번호/);
});
