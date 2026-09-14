import { books } from '../output/markdown/books.mjs';
import { examSummary, examSource } from './exam-mapping.mjs';
const shortTitles = ['소프트웨어', '데이터', '시스템아키텍처', '정보보안', 'IT비즈니스·윤리', '프로젝트·소통'];
export function mountBookNavigation(bookId, mode) {
  document.body.dataset.readerKind = mode;
  const panel = document.createElement('div'); panel.className = 'book-navigation';
  const nav = document.createElement('nav'); nav.setAttribute('aria-label', '다른 교재로 바로 이동');
  for (const [i, book] of books.entries()) {
    const link = document.createElement('a');
    const path = mode === 'pdf' ? `../viewer/index.html?book=${book.id}&page=1` : `../output/markdown/reader.html?book=${book.id}#page-${String(book.startPage).padStart(3, '0')}`;
    link.href = new URL(path, import.meta.url).href;
    link.textContent = `${book.id} ${shortTitles[i]}`;
    link.title = book.title;
    if (book.id === bookId) link.setAttribute('aria-current', 'page');
    nav.append(link);
  }
  const summary = document.createElement('div'); summary.className = 'exam-summary';
  const label = document.createElement('span'); label.textContent = examSummary(bookId);
  const source = document.createElement('a'); source.href = examSource; source.textContent = '2026 공식 기준'; source.target = '_blank'; source.rel = 'noopener';
  summary.append(label, source); panel.append(nav, summary); document.body.prepend(panel);
  const resize = () => document.documentElement.style.setProperty('--books-height', `${Math.ceil(panel.getBoundingClientRect().height)}px`);
  new ResizeObserver(resize).observe(panel); resize();
}
