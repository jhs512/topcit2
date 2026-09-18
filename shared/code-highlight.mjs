const aliases = { 'python 3': 'python', py: 'python', python3: 'python', js: 'javascript', html: 'markup', xml: 'markup', 'c++': 'cpp', 'c#': 'csharp', sh: 'bash', shell: 'bash' };
let engine;
const done = new WeakMap();
const pending = new Set();
let scheduled = false;
const style = document.createElement('link');
style.rel = 'stylesheet';
style.href = new URL('./code-highlight.css', import.meta.url).href;
document.head.append(style);

async function flush() {
  scheduled = false;
  const blocks = [...pending];
  pending.clear();
  if (!blocks.length) return;
  const { default: Prism } = await (engine ||= import('./vendor/prism.mjs'));
  for (const code of blocks) {
    if (!code.isConnected) continue;
    const raw = (code.dataset.language || code.className.match(/language-([\w+#-]+)/)?.[1] || code.closest('[data-language]')?.dataset.language || '').toLowerCase().trim();
    const language = aliases[raw] || raw;
    const text = code.textContent;
    const key = language + '\0' + text;
    if (done.get(code) === key || !Prism.languages[language]) continue;
    done.set(code, key);
    code.innerHTML = Prism.highlight(text, Prism.languages[language], language);
    code.classList.add('syntax-highlight');
  }
}
function collect(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  if (node.matches('pre code')) pending.add(node);
  for (const code of node.querySelectorAll('pre code')) pending.add(code);
  if (pending.size && !scheduled) { scheduled = true; queueMicrotask(flush); }
}
collect(document.body);
new MutationObserver(records => {
  for (const record of records) {
    const code = record.target.parentElement?.closest('pre code') || record.target.closest?.('pre code');
    if (code) collect(code);
    for (const node of record.addedNodes) collect(node);
  }
}).observe(document.body, { childList: true, subtree: true, characterData: true });
