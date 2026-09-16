export function redirectPage(target, title) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><link rel="canonical" href="${target}"></head><body><p>주소가 변경되었습니다. <a href="${target}">${title}</a></p><script>const target=new URL(${JSON.stringify(target)},location.href);target.search=location.search;target.hash=location.hash;location.replace(target.href);</script></body></html>\n`;
}
