// Verified against every contents table in the six catalog source Markdown files.
// These inclusive ranges are independent of the reader's "start reading" shortcut.
export const contentsPageRanges = Object.freeze({
  '01': [8, 16], '02': [8, 19], '03': [8, 21],
  '04': [8, 13], '05': [8, 15], '06': [8, 14],
});

export function isContentsTable(table) {
  const cells = [...(table.rows[0]?.cells || [])].map(c => c.textContent.trim());
  return cells.length === 2 && cells[0] === '목차' && ['교재 쪽수', '책 쪽수', '쪽'].includes(cells[1]);
}

export function applyBookSpeechPolicy(section, book, page) {
  const [first, last] = contentsPageRanges[book.id] || [];
  const tables = [...section.querySelectorAll('table')];
  const contents = page >= first && page <= last || tables.some(isContentsTable);
  const excluded = contents || page < book.startPage;
  section.dataset.bookSection = contents ? 'contents' : excluded ? 'front-matter' : 'body';
  if (excluded) {
    section.dataset.ttsExclude = '';
    section.removeAttribute('data-tts-content');
    section.classList.remove('tts-readable');
    section.querySelectorAll('.tts-readable').forEach(node => node.classList.remove('tts-readable'));
    // A contents table keeps its exclusion even when moved into the educational zoom area.
    for (const node of [...section.children, ...tables]) node.dataset.ttsExclude = '';
  } else {
    section.dataset.ttsContent = '';
    section.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,td,th').forEach(node => node.classList.add('tts-readable'));
  }
}
