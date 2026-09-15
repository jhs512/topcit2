import { splitSpeech, koreanVoice, StorySpeech } from './speech-engine.mjs';

export function storyChunks(article) {
  return [...article.querySelectorAll('h1, h2, h3, p, li')]
    .filter(node => !node.closest('[data-speech-controls]'))
    .flatMap(node => {
      const copy = node.cloneNode(true);
      // Existing story links are source/page citations; their surrounding prose remains intact.
      copy.querySelectorAll('a, button, [aria-hidden="true"]').forEach(el => el.remove());
      const text = copy.textContent.replace(/https?:\/\/\S+/g, '').replace(/(?:\s*·\s*)+$/g, '').trim();
      return splitSpeech(text);
    });
}

const article = document.querySelector('article.story');
if (article) {
  const blocks = [...article.querySelectorAll('h1, h2, h3, p, li')];
  const panel = document.createElement('section');
  panel.className = 'speech-controls'; panel.dataset.speechControls = '';
  panel.setAttribute('aria-label', '사례 읽어주기');
  panel.innerHTML = `<div class="speech-buttons"><button type="button" data-action="play" disabled>이어읽기</button><button type="button" data-action="pause" disabled>일시정지</button><button type="button" data-action="stop" disabled>정지</button><label>속도 <select aria-label="읽기 속도"><option value="0.75">0.75배</option><option value="1" selected>1배</option><option value="1.25">1.25배</option><option value="1.5">1.5배</option></select></label></div><p class="speech-status" role="status" aria-live="polite">한국어 음성을 확인하고 있습니다.</p><p class="speech-help">본문 옆 ▶ 버튼으로 해당 문단을 읽습니다. 이어읽기는 멈춘 문장부터, 속도 변경은 다음 문장부터 적용됩니다. 화면을 떠나면 정지합니다.</p>`;
  article.querySelector('header').after(panel);
  const play = panel.querySelector('[data-action="play"]');
  const pause = panel.querySelector('[data-action="pause"]');
  const stop = panel.querySelector('[data-action="stop"]');
  const speed = panel.querySelector('select');
  const status = panel.querySelector('.speech-status');
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    play.disabled = speed.disabled = true;
    status.textContent = '이 브라우저는 읽어주기를 지원하지 않습니다. 다른 브라우저에서 열어 주세요.';
  } else {
    const synth = window.speechSynthesis;
    let activeBlock;
    const controller = new StorySpeech(synth, window.SpeechSynthesisUtterance, [], ({ state, message }) => {
      panel.dataset.state = state;
      play.disabled = state !== 'paused';
      for (const block of blocks) block.classList.toggle('speech-active', block === activeBlock && ['starting', 'speaking', 'paused'].includes(state));
      pause.disabled = !['starting', 'speaking'].includes(state);
      stop.disabled = !['starting', 'speaking', 'paused'].includes(state);
      status.textContent = message;
    });
    for (const [index, block] of blocks.entries()) {
      const holder = document.createElement('div'); holder.append(block.cloneNode(true));
      const chunks = storyChunks(holder);
      if (!chunks.length) continue;
      block.classList.add('speech-block');
      if (/^H[1-6]$/.test(block.tagName)) block.setAttribute('aria-label', block.textContent);
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'block-speech-button';
      button.setAttribute('aria-label', `${index + 1}번째 텍스트 읽기: ${chunks[0].slice(0, 35)}`);
      button.title = '이 텍스트 읽기';
      button.onclick = () => {
        if (activeBlock !== block) {
          controller.stop(); activeBlock = block; controller.chunks = chunks;
        }
        controller.start();
      };
      block.append(button);
    }
    let voiceTimer;
    const refreshVoices = () => {
      if (!['idle', 'ended', 'error'].includes(controller.state)) return;
      const voice = koreanVoice(synth.getVoices());
      if (voice) {
        clearTimeout(voiceTimer);
        status.textContent = `한국어 음성 준비됨 · ${voice.name}`;
      }
    };
    voiceTimer = setTimeout(() => {
      if (controller.state === 'idle' && !koreanVoice(synth.getVoices())) status.textContent = '한국어 음성을 찾지 못했습니다. 기기의 한국어 음성을 확인한 뒤 본문의 읽기 버튼을 눌러 주세요.';
    }, 5000);
    synth.addEventListener('voiceschanged', refreshVoices);
    refreshVoices();
    play.onclick = () => controller.start();
    pause.onclick = () => controller.pause();
    stop.onclick = () => controller.stop();
    speed.onchange = () => controller.setRate(Number(speed.value));
    addEventListener('pagehide', () => { clearTimeout(voiceTimer); controller.stop(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) controller.stop(); });
  }
}
