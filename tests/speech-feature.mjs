import { execFileSync } from 'node:child_process';
// Tests use isolated browser profiles; no repository flags are changed.
for (const path of ['tests/speech-disabled.mjs', 'tests/speech-scope.mjs', 'tests/speech-contents.mjs', 'tests/speech-layout.mjs', 'tests/speech-list-paragraphs.mjs', 'tests/speech-toggle.mjs', 'tests/speech-browser.mjs', 'tests/speech-highlight.mjs', 'tests/speech-context.mjs']) {
  execFileSync(process.execPath, [path], { stdio: 'inherit' });
}
