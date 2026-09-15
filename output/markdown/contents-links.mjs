// The six archived PDFs include two pages before printed page 1.
// Source checks and the reader-page mapping are recorded in notes/contents-links.md.
export const printedPageOffsets = { '01': 2, '02': 2, '03': 2, '04': 2, '05': 2, '06': 2 };
const normalize = text => text.replace(/^(?:[IVXLCDM]+\.|\d+\.?|[가-힣]\))\s*/i, '').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();

export function linkContents(pages, book) {
  const offset = printedPageOffsets[book.id];
  if (offset === undefined) return;
  for (const page of pages.filter(p => p.number < book.startPage)) {
    for (const table of page.node.querySelectorAll('table')) {
      const headers = [...(table.rows[0]?.cells || [])].map(c => c.textContent.trim());
      if (headers.length !== 2 || headers[0] !== '목차' || !['교재 쪽수', '책 쪽수', '쪽'].includes(headers[1])) continue;
      for (const row of [...table.rows].slice(1)) {
        if (row.cells.length !== 2 || !/^\d+$/.test(row.cells[1].textContent.trim())) continue;
        const printed = Number(row.cells[1].textContent.trim());
        const target = pages.find(p => p.number === printed + offset && p.number >= book.startPage);
        if (!target) continue;
        const title = row.cells[0].textContent.trim();
        const heading = [...target.node.querySelectorAll('h1,h2,h3,h4,h5,h6')].find(h => normalize(h.textContent) === normalize(title));
        const href = `#${heading?.id || target.node.id}`;
        row.classList.add('contents-row');
        for (const cell of row.cells) {
          const link = document.createElement('a');
          link.href = href;
          link.className = 'contents-link';
          link.setAttribute('aria-label', `${title}, 교재 ${printed}쪽 · PDF ${target.number}쪽으로 이동`);
          link.append(...cell.childNodes);
          cell.append(link);
        }
      }
    }
  }
}
