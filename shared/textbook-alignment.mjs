// Node 빌드용: 항목별 교재 대응과 본문 보강의 공통 원본.
import { readFileSync } from 'node:fs';
import { books } from '../output/markdown/books.mjs';

export const alignment = JSON.parse(readFileSync(new URL('./textbook-alignment.json', import.meta.url), 'utf8'));
export const legacyCaseAlignment = JSON.parse(readFileSync(new URL('./textbook-case-alignment.json', import.meta.url), 'utf8'));
export const studyPaths = JSON.parse(readFileSync(new URL('./textbook-study-paths.json', import.meta.url), 'utf8'));
export const casePrefixes = { SW: '01', DATA: '02', ARCH: '03', SEC: '04', BIZ: '05-01', ETH: '05-02', PM: '06-01', COM: '06-02' };
export const textbookUrl = ({ book, page }) => `https://jhs512.github.io/topcit2/textbook/${book}/#page-${String(page).padStart(3, '0')}`;
export const textbookTitle = id => books.find(book => book.id === id)?.title;
export function validateTextbookAlignment() {
  const records = [...Object.values(alignment).flat(), ...Object.values(legacyCaseAlignment), ...Object.values(studyPaths).flat()];
  const sources = new Map(books.map(book => [book.id, readFileSync(new URL(`../output/markdown/${book.source}`, import.meta.url), 'utf8')]));
  for (const record of records) {
    const book = books.find(book => book.id === record.book);
    if (!book || !Number.isInteger(record.page) || record.page < 1 || record.page > book.pages) throw new Error(`교재 페이지 범위 오류: ${record.book}/${record.page}`);
    const body = sources.get(book.id).split(`<!-- PDF page: ${String(record.page).padStart(3, '0')} -->`)[1]?.split('<!-- PDF page:')[0];
    if (!body?.trim() || !record.concept?.trim() || !record.summary?.trim()) throw new Error(`교재 근거 내용 누락: ${record.book}/${record.page}`);
  }
  for (const id of Object.values(casePrefixes)) {
    if (alignment[id]?.length !== 20 || !studyPaths[id]?.length) throw new Error(`${id}: 20개 대응과 추가 학습 내용이 필요합니다.`);
    for (const record of alignment[id]) if (!record.core?.trim() || !record.caseReason?.trim()) throw new Error(`${id}: 본문 또는 사례 연결 설명 누락`);
    for (const record of studyPaths[id]) if (!record.question?.trim()) throw new Error(`${id}: 추가 학습의 확인 질문 누락`);
  }
  for (let n = 1; n <= 11; n++) if (!legacyCaseAlignment[`BIZ-${String(n).padStart(2, '0')}`]?.caseReason?.trim()) throw new Error(`BIZ-${n}: 기존 사례 대응 누락`);
}
export function caseAlignment(id) {
  if (legacyCaseAlignment[id]) return legacyCaseAlignment[id];
  const [prefix, number] = id.split('-');
  return alignment[casePrefixes[prefix]]?.[Number(number) - 1];
}
export function strengthenNote(subjectId, item, index) {
  const source = alignment[subjectId]?.[index];
  if (!source?.core) throw new Error(`${subjectId}/${index + 1}: 교재 개념 본문이 필요합니다.`);
  const [title, , example, question] = item;
  if (!source.noteExplanation?.trim()) throw new Error(`${subjectId}/${index + 1}: 완성된 설명 원고가 필요합니다. 문장을 자동으로 이어 붙이지 않습니다.`);
  return [source.noteTitle || title, source.noteExplanation, source.noteExample || example, source.noteQuestion || question];
}
const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function renderTextbookConnection(record, id, kind = 'note') {
  if (!record || !textbookTitle(record.book)) throw new Error(`${id}: 교재 대응이 없습니다.`);
  return `<section class="textbook-connection" aria-labelledby="${esc(id)}-textbook"><h3 id="${esc(id)}-textbook" class="tts-readable">관련 교재 내용</h3><p><strong>${esc(textbookTitle(record.book))}</strong> · ${esc(record.concept)}</p><p class="tts-readable">${esc(record.summary)}</p>${kind === 'case' ? `<p class="tts-readable"><strong>이 사례에 적용한 내용:</strong> ${esc(record.caseReason)}</p>` : ''}<p><a href="${esc(textbookUrl(record))}">교재 ${record.page}쪽 확인 →</a></p><p>${esc(record.relation)} · 교재 원문 인용이 아닌 자체 설명입니다.</p></section>`;
}
export function renderStudyPaths(subjectId) {
  const paths = studyPaths[subjectId];
  if (!paths?.length) throw new Error(`${subjectId}: 추가 학습 경로가 없습니다.`);
  return `<section class="references textbook-study" aria-labelledby="textbook-study-title" data-tts-content><h2 id="textbook-study-title" class="tts-readable">교재에서 함께 확인할 내용</h2><p class="tts-readable">위 20개 노트는 교재 개념을 업무에 적용하는 길잡이입니다. 다음 이론과 기법은 별도로 읽고 직접 설명하거나 계산해 보세요. 이 목록도 교재 전체를 대신하지는 않습니다.</p>${paths.map((path, i) => `<section><h3 class="tts-readable">${i + 1}. ${esc(path.concept)}</h3><p class="tts-readable">${esc(path.summary)}</p><p class="tts-readable"><strong>확인해 보기:</strong> ${esc(path.question)}</p><a href="${esc(textbookUrl(path))}">${esc(textbookTitle(path.book))} · ${path.page}쪽 →</a></section>`).join('')}</section>`;
}
