import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pronunciationText,pronunciations} from '../shared/speech-pronunciation.mjs';
import {StorySpeech} from '../shared/speech-engine.mjs';

test('technical terms allow Korean particles and prefer full terms',()=>{
  assert.equal(pronunciationText('IT는 IT비즈니스와 ITSM, API를 다룬다.'),'아이티는 아이티비즈니스와 아이티에스엠, 에이피아이를 다룬다.');
  assert.equal(pronunciationText('TCP/IP, DBMS, NoSQL, SQL문, C++, C#'),'티씨피/아이피, 디비엠에스, 노에스큐엘, 에스큐엘문, 씨 플러스 플러스, C#');
  assert.equal(pronunciationText('CPU와 RAM, IPv6, NULL'),'씨피유와 램, 아이피 버전 육, 널');
});
test('English words, identifiers, URLs and ambiguous ASCII Roman letters stay intact',()=>{
  const text='BIT GITHUB APIClient IT2 IT_rate someIT it is fine https://example.com/IT IV V VI v2.5';
  assert.equal(pronunciationText(text),text);
  assert.equal(pronunciationText('① V 모델, VModel, Ⅳ장, Ⅴ장, ⅻ'),'① 브이 모델, 브이Model, 4장, 5장, 12');
});
test('every dictionary term matches literally without regex side effects',()=>{
  for(const [term,spoken] of Object.entries(pronunciations))assert.equal(pronunciationText(term),spoken,term);
});
test('speech engine sends pronunciation at 3x without changing source chunks',()=>{
  const chunks=['IT는 API를 쓴다.','V 모델과 Ⅴ장.'],spoken=[];
  const engine=new StorySpeech({getVoices:()=>[{lang:'ko-KR'}],cancel(){},resume(){},speak:u=>spoken.push(u)},class{constructor(text){this.text=text}},chunks,()=>{}, {setTimeout(){},clearTimeout(){}});
  engine.setRate(3);engine.start();
  assert.equal(spoken[0].text,'아이티는 에이피아이를 쓴다.');assert.equal(spoken[0].rate,3);
  spoken[0].onend();assert.equal(spoken[1].text,'브이 모델과 5장.');
  assert.deepEqual(chunks,['IT는 API를 쓴다.','V 모델과 Ⅴ장.']);engine.stop();
});
