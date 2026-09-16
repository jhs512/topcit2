// Painting only: neither implementation changes source nodes or selection.
export function createSpeechHighlight() {
  const native = !!(globalThis.CSS?.highlights && globalThis.Highlight);
  let ranges = [], overlay;
  function clear() {
    ranges = [];
    if (native) CSS.highlights.delete('speech-sentence');
    overlay?.remove(); overlay = undefined;
  }
  function paint() {
    if (native) return;
    overlay?.remove();
    if (!ranges.length) return;
    overlay = document.createElement('div'); overlay.className = 'speech-range-overlay';
    overlay.dataset.speechControls = ''; overlay.setAttribute('aria-hidden', 'true');
    for (const range of ranges) for (const rect of range.getClientRects()) {
      if (!rect.width || !rect.height) continue;
      const mark = document.createElement('span');
      Object.assign(mark.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
      overlay.append(mark);
    }
    document.body.append(overlay);
  }
  const events = new AbortController();
  addEventListener('scroll', paint, { capture: true, passive: true, signal: events.signal });
  addEventListener('resize', paint, { signal: events.signal });
  return {
    show(next) { clear(); ranges = next; if (native) CSS.highlights.set('speech-sentence', new Highlight(...ranges)); else paint(); },
    clear,
    dispose() { clear(); events.abort(); },
  };
}
