import { examSummary } from '../../shared/exam-mapping.mjs';
import { books } from './books.mjs';
// Preserve links shared before the library was introduced.
function redirectLegacyLink() {
  if (/^#(?:page-|p\d{3}-h)/.test(location.hash)) location.replace(`./reader.html?book=05${location.hash}`);
}
redirectLegacyLink();
addEventListener('hashchange', redirectLegacyLink);
const grid = document.querySelector('#library');
for (const book of books) {
  const card = document.createElement('article'); card.className = `book-card ${book.status}`;
  const top = document.createElement('div'); top.className = 'card-top';
  const number = document.createElement('span'); number.className = 'book-number'; number.textContent = book.id;
  top.append(number);
  if (book.status !== 'ready') {
    const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = '변환 준비 중'; top.append(badge);
  }
  const area = document.createElement('p'); area.className = 'eyebrow'; area.textContent = book.area;
  const title = document.createElement('h2'); title.textContent = book.title;
  const description = document.createElement('p'); description.className = 'description'; description.textContent = book.description;
  const exam = document.createElement('p'); exam.className = 'card-exam'; exam.textContent = examSummary(book.id);
  const bottom = document.createElement('div'); bottom.className = 'card-bottom';
  const count = document.createElement('span'); count.textContent = `PDF ${book.pages}쪽`; bottom.append(count);
  if (book.status === 'ready') {
    const a = document.createElement('a'); a.href = new URL(`../../textbook/${book.id}/#page-${String(book.startPage).padStart(3, '0')}`, import.meta.url).href; a.textContent = '책 펼치기 ↗'; bottom.append(a);
    try {
      const saved = Number(localStorage.getItem(`topcit-reader-${book.id}-page`) || (book.id === '05' ? localStorage.getItem('topcit-reader-page') : null));
      if (saved >= 1 && saved <= book.pages) {
        const resume = document.createElement('a'); resume.className = 'continue'; resume.href = new URL(`../../textbook/${book.id}/#page-${String(saved).padStart(3, '0')}`, import.meta.url).href; resume.textContent = `${saved}쪽 이어서 읽기 →`; card.append(resume);
      }
    } catch {}
  } else {
    const note = document.createElement('span'); note.textContent = '검수 후 공개'; bottom.append(note);
  }
  card.prepend(top, area, title, description, exam, bottom); grid.append(card);
}
