export const KEY = 'topcit2-practice-v1';
export const AREAS = [
  {id:'business', title:'IT비즈니스', description:'전략·서비스·윤리·프로젝트 관리', code:'M4'},
  {id:'systems-security', title:'시스템아키텍처 및 정보보안', description:'컴퓨터 구조·운영체제·네트워크·보안', code:'M3'},
];
export const questionKey = q => `${q.id}@${q.revision}`;
export function decode(raw) {
  if (!raw) return {version:1, solved:{}};
  const value = JSON.parse(raw);
  if (value?.version !== 1 || !value.solved || typeof value.solved !== 'object' || Array.isArray(value.solved)) throw Error('저장된 진도를 읽을 수 없습니다.');
  return {version:1, solved:Object.fromEntries(Object.entries(value.solved).filter(([,v]) => v === true))};
}
export function remaining(questions, state) { return questions.filter(q => state.solved[questionKey(q)] !== true); }
export function pick(questions, state, previousId, random=Math.random) {
  const available=remaining(questions,state);
  const pool=available.length>1 ? available.filter(q=>q.id!==previousId) : available;
  return pool.length ? pool[Math.min(pool.length-1,Math.floor(random()*pool.length))] : null;
}
export function grade(state, q, selected) {
  if (!Number.isInteger(selected) || selected<0 || selected>=q.options.length) throw Error('보기를 선택하세요.');
  const correct=selected===q.answer;
  if(correct) state.solved[questionKey(q)]=true;
  return correct;
}
export function reset(state, questions) {
  const ids=new Set(questions.map(q=>q.id));
  for(const key of Object.keys(state.solved)) if(ids.has(key.split('@')[0])) delete state.solved[key];
}
export function shuffle(values, random=Math.random) {
  const result=[...values];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
