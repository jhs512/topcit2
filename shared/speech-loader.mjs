import { defaultTtsEnabled, ttsPreferenceKey } from './site-features.mjs';

export function initializeTts(button) {
  const readPreference = () => {
    try {
      const value = localStorage.getItem(ttsPreferenceKey);
      return value === 'true' || value !== 'false' && defaultTtsEnabled;
    } catch { return defaultTtsEnabled; }
  };
  let enabled = false, revision = 0, modulePromise, cleanup, style;
  async function setEnabled(next, persist = false) {
    enabled = next;
    const token = ++revision;
    if (persist) { try { localStorage.setItem(ttsPreferenceKey, String(next)); } catch {} }
    button.textContent = next ? 'TTS 켜짐' : 'TTS 꺼짐';
    button.setAttribute('aria-pressed', String(next));
    button.setAttribute('aria-label', next ? 'TTS 끄기 (현재 켜짐)' : 'TTS 켜기 (현재 꺼짐)');
    button.removeAttribute('title');
    if (!next) {
      cleanup?.(); cleanup = undefined;
      style?.remove(); style = undefined;
      return;
    }
    if (cleanup) return;
    try {
      modulePromise ||= import('./speech.mjs?v=20260916-saved-rate').catch(error => { modulePromise = undefined; throw error; });
      const speech = await modulePromise;
      if (!enabled || token !== revision) return;
      style = document.createElement('link');
      style.rel = 'stylesheet'; style.href = new URL('./speech.css?v=20260916-saved-rate', import.meta.url).href;
      document.head.append(style);
      cleanup = speech.mountSpeech(document.body);
    } catch {
      if (token !== revision) return;
      await setEnabled(false, true);
      button.title = '읽어주기를 불러오지 못했습니다. 다시 켜 주세요.';
    }
  }
  button.addEventListener('click', () => setEnabled(!enabled, true));
  addEventListener('storage', event => {
    if (event.key === ttsPreferenceKey || event.key === null) setEnabled(readPreference());
  });
  addEventListener('pageshow', event => { if (event.persisted) setEnabled(readPreference()); });
  setEnabled(readPreference());
}
