"""Verify shipped answers with execution and independent simulation models."""
import contextlib, io, json, sqlite3
from collections import deque
from pathlib import Path
root=Path(__file__).resolve().parents[1]
questions={q['id']:q for p in (root/'practice/data').glob('*.json') for q in json.loads(p.read_text(encoding='utf-8'))}
proofs=json.loads((root/'practice/authoring/execution-proofs.json').read_text(encoding='utf-8'))
counts={}
policy_paths=set()
for p in proofs:
    q=questions[p['id']]
    kind=p['type']; counts[kind]=counts.get(kind,0)+1
    if kind=='python':
        out=io.StringIO()
        with contextlib.redirect_stdout(out):exec(p['code'],{})
        value=out.getvalue().strip()
        assert value==q['options'][q['answer']]==p['expected'],q['id']
    elif kind=='sql':
        db=sqlite3.connect(':memory:');db.executescript(p['setup'])
        rows=list(db.execute(p['query']));db.close()
        value='결과 행 없음' if not rows else '\n'.join(' | '.join('NULL' if v is None else str(v) for v in row) for row in rows)
        assert value==q['options'][q['answer']]==p['expected'],q['id']
    elif kind=='pages':
        resident=deque();misses=0;refs=p['sequence'];policy=p['policy']
        for i,v in enumerate(refs):
            if v in resident:
                if policy=='LRU':resident.remove(v);resident.append(v)
                continue
            misses+=1
            if len(resident)==3:
                if policy=='OPT':
                    distances={x:next((j for j,y in enumerate(refs[i+1:]) if y==x),len(refs)+1) for x in resident}
                    resident.remove(max(resident,key=lambda x:distances[x]))
                else:resident.popleft()
            resident.append(v)
        assert misses==p['expected'],q['id']
        assert q['options'][q['answer']]==f'{misses}회',q['id']
    elif kind=='schedule':
        order=p['order'];arrival=dict(zip(order,p['arrivals']));left=dict(A=3,B=1,C=4,D=2)
        time=0;waiting=0;running=None
        while any(left.values()):
            ready=[x for x in order if arrival[x]<=time and left[x]>0]
            if not ready:time+=1;continue
            if p['policy']=='SRTF' or running is None:
                running=min(ready,key=lambda x: (arrival[x],order.index(x)) if p['policy']=='FCFS' else (left[x],arrival[x],order.index(x)))
            waiting+=len(ready)-1
            left[running]-=1
            if not left[running]:running=None
            time+=1
        assert waiting==p['expected'],q['id']
        assert q['options'][q['answer']]==f'{waiting}ms',q['id']
    else:
        staff,managed,mfa,hours=p['attributes']
        matched=[not managed,staff and mfa,not hours,hours and managed,not staff,not mfa]
        allow=[False,True,False,True,False,False]
        first=next(i for i,r in enumerate(p['order'],1) if matched[r])
        value=f'{first}번 규칙 · '+('허용' if allow[p['order'][first-1]] else '거부')
        assert value==p['expected']==q['options'][q['answer']],q['id']
        key=(tuple(p['attributes']),tuple(p['order'][:first]))
        assert key not in policy_paths,q['id']
        policy_paths.add(key)
assert len(proofs)==2189
print('Independent answer verification:',counts)
