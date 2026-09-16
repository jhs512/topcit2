import { marked } from 'marked';

export const caseSchema = Object.freeze({ version: 2, sections: [
  { key: 'lesson', title: '이 글에서 배우는 교훈', required: true },
  { key: 'introduction', title: '들어가기 전에', required: false },
  { key: 'body', title: '본문', required: true },
  { key: 'conclusion', title: '결론', required: true },
  { key: 'references', title: '참고', required: false },
] });
export function parseCases(source, file = 'reading/it-business-stories.md') {
  const fail = (id, message) => { throw new Error(`${file} [${id}]: ${message}`); };
  const text = source.replace(/\r\n/g, '\n');
  if ((text.match(/<!-- case-schema:/g) || []).length !== 1 || !text.startsWith(`<!-- case-schema: ${caseSchema.version} -->`)) fail('문서', `case-schema: ${caseSchema.version} 선언이 맨 처음 한 번 필요합니다`);
  const boundaries = [...text.matchAll(/^## (.+)$/gm)];
  const cases = [], ids = new Set(); let closing = '';
  for (const [index, heading] of boundaries.entries()) {
    const name = heading[1];
    if (name === '왜 배우는지' && !cases.length) continue;
    const segment = text.slice(heading.index + heading[0].length, boundaries[index + 1]?.index ?? text.length).trim();
    if (name === '마무리' && index === boundaries.length - 1) { closing = segment; continue; }
    const match = name.match(/^([A-Z][A-Z0-9]*-\d{2}) · (\S.*)$/);
    if (!match) fail(name.match(/^([A-Z][A-Z0-9]*-\d{2})/)?.[1] || cases.at(-1)?.id || '문서', `잘못된 사례 제목: ${name}`);
    const [, id, title] = match;
    if (ids.has(id)) fail(id, '중복 사례 ID'); ids.add(id);
    const headers = [...segment.matchAll(/^### (.+)$/gm)];
    const metadata = segment.slice(0, headers[0]?.index ?? segment.length).trim();
    const meta = metadata.match(/^유형: (.+)\n교재 개념: (.+)$/);
    if (!meta) fail(id, '메타데이터는 유형, 교재 개념 순서로 각각 한 줄이어야 합니다');
    if (!/^(실제(?: 성공)? 사례|가상 이야기)(?: · .*)?$/.test(meta[1])) fail(id, '유형은 실제 사례/실제 성공 사례/가상 이야기여야 합니다');
    const result = { id, title, type: meta[1], concept: meta[2] }; let previous = -1;
    for (const [i, h] of headers.entries()) {
      const position = caseSchema.sections.findIndex(s => s.title === h[1]);
      if (position < 0) fail(id, `알 수 없는 구획: ${h[1]}`);
      const schema = caseSchema.sections[position];
      if (Object.hasOwn(result, schema.key)) fail(id, `중복 구획: ${schema.title}`);
      if (position <= previous) fail(id, `순서 위반: ${schema.title}`); previous = position;
      const content = segment.slice(h.index + h[0].length, headers[i + 1]?.index ?? segment.length).trim();
      if (!content.replace(/[\s#>*_`\-]/g, '').length) fail(id, `빈 구획: ${schema.title}`);
      if (/<\/?[a-z]|<!--|^#{1,3} /mi.test(content)) fail(id, `${schema.title}: HTML·구획 외 상위 제목은 허용하지 않습니다`);
      result[schema.key] = content;
    }
    for (const s of caseSchema.sections) if (s.required && !result[s.key]) fail(id, `필수 구획 누락: ${s.title}`);
    const lesson = result.lesson.match(/^추상적인 문장: ([^\n]+)\n근거: \[([^\]\n]+)\]\((https:\/\/jhs512\.github\.io\/topcit2\/textbook\/0[1-6]\/#page-\d{3})\)\n구체적인 문장: ([^\n]+)$/);
    if (!lesson) fail(id, '교훈은 추상적인 문장, 근거(자체 HTML 교재 페이지 링크), 구체적인 문장 순서로 각각 한 번 필요합니다');
    const [, abstract, label, url, concrete] = lesson;
    for (const sentence of [abstract, concrete]) {
      if (!sentence.trim() || /[\[\]<>*_`]/.test(sentence)) fail(id, '교훈의 두 문장은 비어 있지 않은 일반 텍스트여야 합니다');
    }
    const basisPage = label.match(/ · PDF (\d+)쪽$/);
    if (!basisPage || !label.slice(0, basisPage.index).trim() || Number(basisPage[1]) !== Number(url.slice(-3))) fail(id, '근거는 단원명 · PDF N쪽이며 링크의 페이지와 일치해야 합니다');
    if (abstract.trim() === concrete.trim()) fail(id, '추상적인 문장과 구체적인 문장은 서로 달라야 합니다');
    result.lesson = { abstract: abstract.trim(), concrete: concrete.trim(), basis: { label, url } };
    if ([abstract, concrete].includes(result.conclusion)) fail(id, '결론을 교훈과 똑같이 반복할 수 없습니다');
    if (/https:\/\/jhs512\.github\.io\/topcit2?\/(viewer|sources)\//.test(segment)) fail(id, '교재 링크는 자체 HTML 교재를 사용해야 합니다');
    result.referenceItems = [];
    if (result.references) {
      const lines = result.references.split('\n'); let started = false; const context = [];
      for (const line of lines) {
        const ref = line.match(/^(\d+)\. \[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
        if (ref) {
          started = true;
          if (Number(ref[1]) !== result.referenceItems.length + 1) fail(id, '참고 번호는 1부터 중복 없이 연속이어야 합니다');
          result.referenceItems.push({ label: ref[2], url: ref[3] });
        } else if (started && line.trim()) fail(id, '참고 목록에는 번호·링크 형식만 허용합니다');
        else context.push(line);
      }
      if (!result.referenceItems.length) fail(id, '참고 구획에는 번호 링크가 필요합니다');
      result.referenceContext = context.join('\n').trim();
    }
    for (const ref of segment.matchAll(/\]\(#([^)]*)\)/g)) {
      const target = ref[1].match(new RegExp(`^${id}-ref-(\\d+)$`));
      if (!target || Number(target[1]) < 1 || Number(target[1]) > result.referenceItems.length) fail(id, `없는 참고 대상: ${ref[1]}`);
    }
    for (const key of ['introduction', 'body', 'conclusion']) if (/\]\(https?:/.test(result[key] || '')) fail(id, `${key}: 외부 링크는 참고 구획에 두고 번호로 연결하세요`);
    cases.push(result);
  }
  if (!cases.length) fail('문서', '사례가 없습니다');
  return { cases, closing };
}

const esc = value => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function renderMarkdown(text, educational = false) {
  const html = marked.parse(text);
  return (educational ? html.replace(/<(h[1-6]|p|li)>/g, '<$1 class="tts-readable">') : html)
    .replace(/<a href="#([A-Z][A-Z0-9]*-\d{2}-ref-(\d+))">\d+<\/a>/g, '<sup><a href="#$1" aria-label="참고 $2">[$2]</a></sup>');
}
export function renderCase(c) {
  const section = (key, title, content, style = '') => `<section class="case-${key} ${style}" aria-labelledby="${c.id}-${key}"><h2 id="${c.id}-${key}" class="tts-readable">${title}</h2>${renderMarkdown(content, true)}</section>`;
  const story = `<header><p class="case-type">${esc(c.type)}</p><p class="case-concept">교재 개념: <strong>${esc(c.concept)}</strong></p></header>`
    + `<section class="case-lesson" aria-labelledby="${c.id}-lesson"><h2 id="${c.id}-lesson" class="tts-readable">이 글에서 배우는 교훈</h2><div class="lesson-abstract"><p class="tts-readable">${esc(c.lesson.abstract)}</p><p class="lesson-basis"><span>교재 개념을 풀어 쓴 원리이며, 원문 인용은 아닙니다.</span><br>근거: <a href="${esc(c.lesson.basis.url)}">${esc(c.lesson.basis.label)}</a></p></div><div class="lesson-concrete"><p class="tts-readable"><strong>구체적으로는</strong> <span class="lesson-application">${esc(c.lesson.concrete)}</span></p></div></section>`
    + (c.introduction ? section('introduction', '들어가기 전에', c.introduction, 'prerequisites') : '')
    + section('body', '본문', c.body)
    + section('conclusion', '결론', c.conclusion);
  const references = c.referenceItems.length ? `<aside class="case-references" aria-labelledby="${c.id}-references"><h2 id="${c.id}-references">참고</h2>${c.referenceContext ? renderMarkdown(c.referenceContext) : ''}<ol>${c.referenceItems.map((r, i) => `<li id="${c.id}-ref-${i + 1}"><a href="${esc(r.url)}">${esc(r.label)}</a></li>`).join('')}</ol></aside>` : '';
  return { story, references };
}
