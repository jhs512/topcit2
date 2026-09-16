import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitSpeech, splitSpeechRanges, koreanVoice, StorySpeech } from '../shared/speech-engine.mjs';

const ko = { name: '한국어', lang: 'ko-KR', localService: true };
function setup(voices = [ko]) {
  const spoken = [], states = [], timers = new Map(); let id = 0;
  const synth = { getVoices: () => voices, cancel() {}, resume() {}, speak(u) { spoken.push(u); } };
  const engine = new StorySpeech(synth, class { constructor(text) { this.text = text; } }, ['첫 문장.', '다음 문장.'], s => states.push(s), { setTimeout(fn) { timers.set(++id, fn); return id; }, clearTimeout(id) { timers.delete(id); } });
  return { engine, spoken, states, timers };
}
test('long Korean text stays ordered and complete within bounded chunks', () => {
  const text = '고객에게 먼저 설명합니다. '+ '매우긴한글'.repeat(100) + ' 마지막 문장!';
  const parts = splitSpeech(text);
  assert.ok(parts.every(p => p.length <= 180));
  assert.equal(parts.join('').replace(/\s/g, ''), text.replace(/\s/g, ''));
});
test('Korean language match and late voice availability', () => {
  assert.equal(koreanVoice([{ lang: 'en-US' }]), undefined);
  assert.equal(koreanVoice([{ lang: 'ko_KR' }]).lang, 'ko_KR');
  const voices = [], { engine, spoken } = setup(voices);
  engine.start(); assert.equal(spoken.length, 0);
  voices.push(ko); engine.start(); assert.equal(spoken.length, 1);
});
test('duplicate start, pause/resume, rate change and stale cancel callbacks', () => {
  const { engine, spoken } = setup();
  engine.start(); engine.start(); assert.equal(spoken.length, 1);
  spoken[0].onstart(); engine.setRate(1.5); assert.equal(spoken[0].rate, 1);
  engine.pause(); assert.equal(engine.state, 'paused');
  spoken[0].onend(); spoken[0].onerror(); assert.equal(engine.index, 0);
  engine.start(); assert.equal(spoken[1].text, '첫 문장.'); assert.equal(spoken[1].rate, 1.5);
  spoken[1].onend(); assert.equal(spoken[2].text, '다음 문장.');
  engine.stop(); spoken[2].onend(); assert.equal(engine.state, 'idle'); assert.equal(engine.index, 0);
});
test('end, failure, watchdog recovery and switching content', () => {
  const { engine, spoken, timers } = setup();
  engine.start(); spoken[0].onend(); spoken[1].onend(); assert.equal(engine.state, 'ended');
  engine.start(); spoken[2].onerror(); assert.equal(engine.state, 'error');
  engine.start(); [...timers.values()].at(-1)(); assert.equal(engine.state, 'error');
  engine.stop(); engine.chunks = ['다른 블록.']; engine.start(); assert.equal(spoken.at(-1).text, '다른 블록.');
  engine.stop();
});

test('quarter-step rates through 2.5 apply to the next sentence or paused restart', () => {
  const { engine, spoken } = setup();
  for (const rate of [0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5]) {
    engine.setRate(rate); engine.start(); assert.equal(spoken.at(-1).rate, rate); engine.stop();
  }
  for (const rate of [0, 2.75, 3, NaN, '2.5']) { engine.setRate(rate); assert.equal(engine.rate, 2.5); }
  engine.setRate(1); engine.start(); const first = spoken.at(-1); first.onstart();
  engine.setRate(2.5); assert.equal(first.rate, 1);
  first.onend(); assert.equal(spoken.at(-1).rate, 2.5);
  engine.pause(); engine.start(); assert.equal(spoken.at(-1).text, '다음 문장.'); assert.equal(spoken.at(-1).rate, 2.5);
  engine.stop();
});

test('speech offsets distinguish repeats, abbreviations, newlines and long Korean chunks', () => {
  const text = '같은 문장. 같은 문장. API v2.5입니다.\nDr. Kim 설명! ' + '긴한글😀 '.repeat(90) + '끝.';
  const chunks = splitSpeechRanges(text);
  assert.equal(chunks[0].start, 0); assert.equal(chunks[1].start, 7);
  for (const [i, chunk] of chunks.entries()) {
    assert.equal(text.slice(chunk.start, chunk.end), chunk.text);
    assert.ok(chunk.text.length <= 180);
    if (i) assert.ok(chunk.start >= chunks[i - 1].end);
  }
  assert.equal(chunks.map(c => c.text).join('').replace(/\s/g, ''), text.replace(/\s/g, ''));
});
