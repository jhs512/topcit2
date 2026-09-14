import test from 'node:test';
import assert from 'node:assert/strict';
import {decode,grade,pick,remaining,reset,shuffle} from '../practice/engine.mjs';
const qs=[{id:'a',revision:1,answer:2,options:['a','b','c','d']},{id:'b',revision:1,answer:0,options:['a','b','c','d']}];
test('one correct answer removes a question immediately and survives reload',()=>{const s=decode(null);assert.equal(grade(s,qs[0],2),true);const restored=decode(JSON.stringify(s));assert.deepEqual(remaining(qs,restored),[qs[1]]);for(let i=0;i<10;i++)assert.equal(pick(qs,restored,null,()=>i/10).id,'b');});
test('wrong answer remains eligible; avoid immediate repeats when alternatives exist',()=>{const s=decode(null);assert.equal(grade(s,qs[0],1),false);assert.equal(remaining(qs,s).length,2);assert.equal(pick(qs,s,'a',()=>0).id,'b');assert.equal(pick([qs[0]],s,'a',()=>0).id,'a');});
test('all correct completes; scoped reset preserves another area',()=>{const s=decode(null);for(const q of qs)grade(s,q,q.answer);s.solved['other@1']=true;assert.equal(pick(qs,s),null);reset(s,qs);assert.equal(remaining(qs,s).length,2);assert.equal(s.solved['other@1'],true);});
test('revision changes invalidate only revised question',()=>{const s=decode(null);for(const q of qs)grade(s,q,q.answer);assert.deepEqual(remaining([{...qs[0],revision:2},qs[1]],s).map(q=>q.id),['a']);});
test('shuffle preserves original indices and invalid answers cannot mutate progress',()=>{assert.deepEqual(shuffle([0,1,2,3],()=>0).sort(),[0,1,2,3]);const s=decode(null);assert.throws(()=>grade(s,qs[0],4));assert.deepEqual(s.solved,{});assert.throws(()=>decode('{bad'));assert.throws(()=>decode('{"version":1,"solved":[]}'));});
