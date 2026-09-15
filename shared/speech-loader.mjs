import { enableTts } from './site-features.mjs';
if (enableTts) {
  const style = document.createElement('link');
  style.rel = 'stylesheet'; style.href = new URL('./speech.css', import.meta.url).href;
  document.head.append(style);
  await import('./speech.mjs');
}
