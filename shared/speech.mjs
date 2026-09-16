import { splitSpeech, koreanVoice, StorySpeech } from './speech-engine.mjs';

const excluded = 'nav,button,input,select,textarea,svg,script,style,[role="button"],[data-speech-controls],.speech-notice,.sr-only,.selection-tag';
export function visible(element) {
  if (!element.isConnected || element.closest('[hidden],[aria-hidden="true"]')) return false;
  for (let node = element; node instanceof Element; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || style.opacity === '0') return false;
  }
  return element.getClientRects().length > 0;
}
export function readableText(element) {
  if (!visible(element)) return '';
  const copy = element.cloneNode(true);
  const originals = [element, ...element.querySelectorAll('*')];
  const clones = [copy, ...copy.querySelectorAll('*')];
  for (let i = 1; i < originals.length; i++) {
    if (originals[i].matches(excluded + ',a,label,form,fieldset,legend') || !visible(originals[i])) clones[i].remove();
  }
  return copy.textContent.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').replace(/(?:\s*·\s*)+$/g, '').trim();
}

export function mountSpeech(main) {
  let disposed = false, frame;
  const listeners = new AbortController();
  const panel = document.createElement('section');
  panel.className = 'speech-controls'; panel.dataset.speechControls = ''; panel.hidden = true;
  panel.setAttribute('aria-label', '텍스트 읽어주기');
  panel.innerHTML = `<button type="button" class="speech-close" aria-label="읽어주기 닫기 및 정지">닫기 ×</button><div class="speech-buttons"><button type="button" data-action="play" disabled>이어읽기</button><button type="button" data-action="pause" disabled>일시정지</button><button type="button" data-action="stop" disabled>정지</button><label>속도 <select aria-label="읽기 속도"><option value="0.75">0.75배</option><option value="1" selected>1배</option><option value="1.25">1.25배</option><option value="1.5">1.5배</option></select></label></div><p class="speech-status" role="status"></p><p class="speech-help">이어읽기는 멈춘 문장부터, 속도는 다음 문장부터 적용됩니다. 화면을 떠나면 정지합니다.</p>`;
  document.body.append(panel);
  const notice = document.createElement('p'); notice.className = 'speech-notice'; notice.setAttribute('role', 'status'); notice.hidden = true;
  const content = document.querySelector('main');
  if (content) content.before(notice); else main.append(notice);
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    notice.hidden = false; notice.textContent = '이 브라우저는 읽어주기를 지원하지 않습니다.';
    return () => { panel.remove(); notice.remove(); };
  }
  const synth = window.speechSynthesis, entries = new Map();
  const play = panel.querySelector('[data-action="play"]'), pause = panel.querySelector('[data-action="pause"]'), stop = panel.querySelector('[data-action="stop"]'), close = panel.querySelector('.speech-close');
  let active, origin, spokenText, observer;
  const controller = new StorySpeech(synth, window.SpeechSynthesisUtterance, [], ({ state, message }) => {
    if (disposed) return;
    const wasHidden = panel.hidden, focusInside = panel.contains(document.activeElement);
    panel.hidden = !['starting', 'speaking', 'paused', 'error'].includes(state);
    panel.dataset.state = state; play.disabled = state !== 'paused';
    pause.disabled = !['starting', 'speaking'].includes(state); stop.disabled = !['starting', 'speaking', 'paused'].includes(state);
    panel.querySelector('.speech-status').textContent = message;
    notice.hidden = !panel.hidden || state === 'idle' && message === '정지했습니다.';
    if (!notice.hidden) notice.textContent = message;
    active?.classList.toggle('speech-active', ['starting', 'speaking', 'paused'].includes(state));
    if (panel.hidden && focusInside && origin?.isConnected && visible(origin)) origin.focus({ preventScroll: true });
    else if (wasHidden && !panel.hidden) close.focus({ preventScroll: true });
  });
  const dismiss = () => controller.stop();
  play.onclick = () => { if (active && visible(active) && readableText(active) === spokenText) controller.start(); else dismiss(); };
  pause.onclick = () => controller.pause(); stop.onclick = close.onclick = dismiss;
  panel.querySelector('select').onchange = event => controller.setRate(Number(event.target.value));
  panel.onkeydown = event => { if (event.key === 'Escape') { event.preventDefault(); dismiss(); } };
  function remove(node) {
    const entry = entries.get(node);
    entry?.button.remove(); entry?.host.classList.remove('speech-block'); entries.delete(node); node.classList.remove('speech-block', 'speech-active');
    if (entry?.headingText?.parentElement === node) entry.headingText.replaceWith(...entry.headingText.childNodes);
    node.classList.remove('speech-heading');
    if (/^H[1-6]$/.test(node.tagName)) {
      if (entry?.originalLabel !== null && entry?.originalLabel !== undefined) node.setAttribute('aria-label', entry.originalLabel);
      else node.removeAttribute('aria-label');
    }
  }
  function eligible(node) {
    return node.matches('.tts-readable') && !!node.closest('[data-tts-content]') && visible(node) && !node.closest(excluded) && !node.parentElement?.closest('.tts-readable') && !node.closest('a,button') && (!node.closest('label,form') || node.closest('.tts-option'));
  }
  function reconcile(roots) {
    if (disposed) return;
    observer.disconnect();
    try {
      // Only changed branches need visibility checks; book diagrams/progress updates must not rescan every paragraph.
      for (const node of entries.keys()) {
        if (!node.isConnected || roots.some(root => root instanceof Element && (root.contains(node) || node.contains(root))) && !eligible(node)) remove(node);
      }
      const candidates = new Set();
      for (const root of roots) {
        if (!(root instanceof Element) || !main.contains(root) && root !== main) continue;
        if (root.matches('.tts-readable')) candidates.add(root);
        const parent = root.closest('.tts-readable'); if (parent) candidates.add(parent);
        root.querySelectorAll('.tts-readable').forEach(node => candidates.add(node));
      }
      for (const node of candidates) {
        if (!eligible(node)) continue;
        const text = readableText(node); if (!text) { remove(node); continue; }
        let entry = entries.get(node);
        if (entry && !node.contains(entry.button)) { remove(node); entry = undefined; }
        if (!entry) {
          const button = document.createElement('button'); button.type = 'button'; button.className = 'block-speech-button'; button.title = '이 텍스트 읽기';
          button.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 2L12 8L4 14Z" fill="currentColor"/></svg>';
          const host = node.closest('.tts-option') || node;
          let headingText;
          if (/^H[1-6]$/.test(node.tagName)) {
            headingText = document.createElement('span'); headingText.className = 'speech-heading-text';
            headingText.append(...node.childNodes); node.append(headingText); node.classList.add('speech-heading');
          }
          host.classList.add('speech-block'); host.append(button);
          entry = { button, host, headingText, originalLabel: node.getAttribute('aria-label') }; entries.set(node, entry);
          button.onclick = event => {
            event.preventDefault(); event.stopPropagation();
            const current = readableText(node); if (disposed || !eligible(node) || !current) return;
            if (active !== node || current !== spokenText) { dismiss(); active?.classList.remove('speech-active'); active = node; spokenText = current; controller.chunks = splitSpeech(current); }
            origin = button; controller.start();
          };
        }
        // Never put answer text in accessibility labels; hidden content cannot leak through a stale label.
        entry.button.setAttribute('aria-label', '이 텍스트 읽기');
        if (/^H[1-6]$/.test(node.tagName)) node.setAttribute('aria-label', text);
      }
    } finally { observe(); }
  }
  let scheduled = false; const dirty = new Set();
  function schedule(root) {
    if (disposed) return;
    dirty.add(root);
    if (!scheduled) { scheduled = true; frame = requestAnimationFrame(() => { scheduled = false; const roots = [...dirty]; dirty.clear(); reconcile(roots); }); }
  }
  observer = new MutationObserver(records => {
    if (active && (!active.isConnected || !eligible(active) || readableText(active) !== spokenText)) { dismiss(); active?.classList.remove('speech-active'); active = null; }
    for (const record of records) {
      const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      if (!target || target.closest(excluded)) continue;
      if (record.type === 'attributes' && record.attributeName === 'class') {
        const clean = value => (value || '').replace(/\bspeech-(active|block)\b/g, '').trim();
        if (clean(record.oldValue) === clean(target.className)) continue;
      }
      if (record.type === 'childList') {
        for (const node of [...record.addedNodes, ...record.removedNodes]) if (node instanceof Element) schedule(node);
        const parent = target.closest('.tts-readable'); if (parent) schedule(parent);
      } else schedule(target);
    }
  });
  function observe() { if (!disposed) observer.observe(main, { subtree: true, childList: true, characterData: true, attributes: true, attributeOldValue: true, attributeFilter: ['hidden', 'aria-hidden', 'style', 'class', 'open'] }); }
  reconcile([main]);
  synth.addEventListener('voiceschanged', () => { if (!disposed && koreanVoice(synth.getVoices()) && panel.hidden) { notice.hidden = true; } }, { signal: listeners.signal });
  // Warm only the voice list; actual playback always requires a text button click.
  synth.getVoices();
  for (const event of ['site-route-change', 'popstate', 'pagehide']) addEventListener(event, dismiss, { signal: listeners.signal });
  addEventListener('resize', () => { if (active && !visible(active)) dismiss(); schedule(main); }, { signal: listeners.signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) dismiss(); }, { signal: listeners.signal });
  return () => {
    if (disposed) return;
    disposed = true;
    observer.disconnect(); cancelAnimationFrame(frame); dirty.clear(); listeners.abort();
    controller.stop();
    for (const node of [...entries.keys()]) remove(node);
    active = origin = null;
    panel.remove(); notice.remove();
  };
}
