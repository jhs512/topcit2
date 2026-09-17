import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseCases, renderCase } from '../scripts/case-schema.mjs';
const sample = `<!-- case-schema: 2 -->
# 사례
## BIZ-01 · 예시
유형: 가상 이야기
교재 개념: 전략
### 이 글에서 배우는 교훈
추상적인 문장: 전략은 환경을 분석하여 정한다.
근거: [II.03 SWOT 분석 · 38쪽](https://jhs512.github.io/topcit2/textbook/05/#page-038)
구체적인 문장: 판단의 근거를 확인한다.
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
    sample.replace(/### 이 글에서 배우는 교훈[\s\S]*?(?=### 본문)/, ''),
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
test('all eleven cases have the schema and resolvable numbered references', async () => {
  const source = await readFile(new URL('../reading/it-business-stories.md', import.meta.url), 'utf8');
  const { cases, closing } = parseCases(source);
  assert.equal(cases.length, 11);
  assert.equal(cases.filter(c => c.introduction).length, 1);
  assert.equal(cases.filter(c => c.type.startsWith('실제')).length, 4);
  assert.ok(closing.startsWith('열한 편에서'));
  for (const c of cases) {
    assert.ok(c.referenceItems.length);
    const rendered = renderCase(c);
    for (const ref of rendered.story.matchAll(/href="#([^"]+)"/g)) assert.ok(rendered.references.includes(`id="${ref[1]}"`));
  }
  assert.throws(() => parseCases(source.replace('#BIZ-01-ref-1', '#BIZ-01-ref-999'), 'draft.md'), /draft\.md \[BIZ-01\].*없는 참고/);
  assert.throws(() => parseCases(source.replace('\n2. [', '\n1. ['), 'draft.md'), /draft\.md \[BIZ-11\].*참고 번호/);
});

test('both lesson sentences and textbook basis are mandatory, distinct and ordered', () => {
  const abstract = '추상적인 문장: 전략은 환경을 분석하여 정한다.';
  const concrete = '구체적인 문장: 판단의 근거를 확인한다.';
  const basis = '근거: [II.03 SWOT 분석 · 38쪽](https://jhs512.github.io/topcit2/textbook/05/#page-038)';
  const invalid = [
    ...[abstract, concrete, basis].map(line => sample.replace(line, '')),
    ...[abstract, concrete, basis].map(line => sample.replace(line, line + '\n' + line)),
    sample.replace(abstract, '추상적인 문장:   '),
    sample.replace(concrete, '구체적인 문장:   '),
    sample.replace(abstract, '__SWAP__').replace(concrete, abstract).replace('__SWAP__', concrete),
    sample.replace('판단의 근거를 확인한다.', '전략은 환경을 분석하여 정한다.'),
    sample.replace('page-038', 'page-039'),
    sample.replace('II.03 SWOT 분석 · 38쪽', '교재'),
    sample.replace('/textbook/05/#page-038', '/viewer/?book=05&page=38'),
  ];
  for (const source of invalid) assert.throws(() => parseCases(source, 'draft.md'), /draft\.md \[BIZ-01\]/);
  const c = parseCases(sample).cases[0];
  assert.equal(c.lesson.abstract, '전략은 환경을 분석하여 정한다.');
  assert.equal(c.lesson.concrete, '판단의 근거를 확인한다.');
  const html = renderCase(c).story;
  assert.ok(!html.includes('추상적인 문장'));
  assert.ok(!html.includes('구체적인 문장'));
  assert.ok(html.indexOf(c.lesson.abstract) < html.indexOf('구체적으로는'));
  assert.ok(html.includes('원문 인용은 아닙니다.'));
  const lessonBox = html.match(/<section class="case-lesson"[\s\S]*?<\/section>/)?.[0];
  for (const content of ['이 글에서 배우는 교훈', c.lesson.abstract, '구체적으로는', c.lesson.concrete, c.lesson.basis.url]) assert.ok(lessonBox?.includes(content));
});
