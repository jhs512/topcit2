import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const flag = new URL('../cases/features.mjs', import.meta.url);
const original = await readFile(flag, 'utf8');
if (!original.includes('enableCaseSpeech = false')) throw Error('Start feature test with the flag disabled');
const run = path => execFileSync(process.execPath, [path], { stdio: 'inherit' });
try {
  run('scripts/build-cases.mjs'); run('tests/speech-disabled.mjs');
  await writeFile(flag, original.replace('enableCaseSpeech = false', 'enableCaseSpeech = true'));
  run('scripts/build-cases.mjs'); run('tests/speech-browser.mjs');
} finally {
  await writeFile(flag, original);
  run('scripts/build-cases.mjs');
}
run('tests/speech-disabled.mjs');
