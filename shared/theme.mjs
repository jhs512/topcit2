const key = 'topcit2-theme';
const buttons = new Set();
const book = location.pathname.match(/\/textbook\/(0[1-6])\//)?.[1] || new URLSearchParams(location.search).get('book') || '05';
let saved;
try { saved = localStorage.getItem(key) || localStorage.getItem(`topcit-reader-${book}-theme`) || (book === '05' && localStorage.getItem('topcit-reader-theme')); } catch {}
const stylesheet = document.createElement('link');
stylesheet.rel = 'stylesheet'; stylesheet.href = new URL('./theme.css', import.meta.url).href;
document.head.append(stylesheet);
function apply(value) {
  const dark = value === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  for (const button of buttons) {
    button.textContent = dark ? '라이트' : '다크';
    button.setAttribute('aria-pressed', String(dark));
    button.setAttribute('aria-label', dark ? '라이트모드로 전환' : '다크모드로 전환');
    button.title = button.getAttribute('aria-label');
  }
}
apply(saved);
export function bindThemeButton(button) {
  buttons.add(button);
  button.onclick = () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(key, next); } catch {}
    apply(next);
  };
  apply(document.documentElement.dataset.theme);
}
addEventListener('storage', event => { if (event.key === key || event.key === null) apply(event.newValue); });
