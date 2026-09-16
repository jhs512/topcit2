export const excluded = 'nav,button,input,select,textarea,svg,script,style,[role="button"],[data-speech-controls],[data-tts-exclude],.speech-notice,.sr-only,.selection-tag';
export function visible(element) {
  if (!element.isConnected || element.closest('[hidden],[aria-hidden="true"]')) return false;
  for (let node = element; node instanceof Element; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || style.opacity === '0') return false;
  }
  return element.getClientRects().length > 0;
}

// Each normalized UTF-16 character retains its original node/offset. Skipped
// controls never become part of a highlighted Range; inline link labels do.
export function mapSpeechText(element) {
  const raw = [], allowed = new Map();
  if (!visible(element)) return { text: '', points: [] };
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (let node; (node = walker.nextNode());) {
    const parent = node.parentElement;
    if (!allowed.has(parent)) {
      let blocked = false;
      for (let ancestor = parent; ancestor && ancestor !== element; ancestor = ancestor.parentElement) {
        if (ancestor.matches(excluded + ',label,form,fieldset,legend')) { blocked = true; break; }
      }
      allowed.set(parent, !blocked && visible(parent));
    }
    if (!allowed.get(parent)) continue;
    for (let offset = 0; offset < node.data.length; offset++) raw.push({ node, offset, char: node.data[offset] });
  }
  const rawText = raw.map(p => p.char).join('');
  const skip = new Set();
  for (const match of rawText.matchAll(/https?:\/\/\S+/g)) for (let i = match.index; i < match.index + match[0].length; i++) skip.add(i);
  const points = [];
  for (let i = 0; i < raw.length; i++) {
    if (skip.has(i)) continue;
    const point = raw[i], char = /\s/.test(point.char) ? ' ' : point.char;
    if (char === ' ' && (!points.length || points.at(-1).char === ' ')) continue;
    points.push({ ...point, char });
  }
  while (points.length && /[ ·]/.test(points.at(-1).char)) points.pop();
  return { text: points.map(p => p.char).join(''), points, nodes: new Map(points.map(p => [p.node, p.node.data])) };
}
export const readableText = element => mapSpeechText(element).text;
export function speechRanges(mapping, start, end) {
  const ranges = []; let range, previous;
  for (const point of mapping.points.slice(start, end)) {
    if (!range || point.node !== previous.node || point.offset !== previous.offset + 1) {
      range = document.createRange(); range.setStart(point.node, point.offset); ranges.push(range);
    }
    range.setEnd(point.node, point.offset + 1); previous = point;
  }
  return ranges;
}
