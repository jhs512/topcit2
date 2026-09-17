"""Build authored recognition questions and executable reasoning exercises.

This is an offline authoring tool, never loaded in a student's browser.
Values are fixed; variants change operations, their order, predicates, or policies.
All executable questions carry their complete input and a worked trace.
"""
import contextlib
import io
import itertools as it
import json
from pathlib import Path
import sqlite3
import subprocess

ROOT = Path(__file__).resolve().parents[1]
distribution = json.loads(subprocess.check_output(
    ['node', '--input-type=module', '-e', "import {distribution} from './practice/distribution.mjs'; console.log(JSON.stringify(distribution));"],
    cwd=ROOT, text=True, encoding='utf-8'))
targets = {a['id']: a['target'] for a in distribution['areas']}
DATA = ROOT / 'practice/data'
PREFIX = {'software': 'sw4', 'data': 'data4', 'business': 'biz4', 'systems-security': 'sys4'}
bank = {a: [] for a in PREFIX}
for a in ['business', 'systems-security']:
    bank[a] = json.loads((DATA / f'{a}.json').read_text(encoding='utf-8'))[:300]
    assert len(bank[a]) == 300
    assert all(q['id'] == f'{PREFIX[a]}-{i:03}' for i, q in enumerate(bank[a], 1))
original = {a: json.dumps(q, ensure_ascii=False, sort_keys=True) for a, q in bank.items()}
proofs = []
syllabus_names = {entry['code']: entry['text'] for entry in json.loads((ROOT/'syllabus/data.json').read_text(encoding='utf-8'))['entries']}

def add(area, syllabus, topic, prompt, answer, wrong, concept, reason, **extra):
    assert len(wrong) == 3, (topic, wrong)
    options = [answer] + [v for v, _ in wrong]
    assert len(set(options)) == 4, (topic, options)
    n = len(bank[area]) + 1
    correct = (n - 1) % 4
    options = options[-correct:] + options[:-correct] if correct else options
    q = dict(id=f'{PREFIX[area]}-{n:03}', revision=1, area=area, syllabus=syllabus,
             topic=topic, prompt=prompt, options=options, answer=correct,
             explanation=f'핵심 개념: {concept}\n\n정답인 이유: {reason}\n\n오답 구분: ' +
             '\n'.join(f'‘{v}’: {why}' for v, why in wrong),
             source={'url': f'https://jhs512.github.io/topcit2/syllabus/#ref-{syllabus}',
                     'section': f'V4.0K {syllabus} · {topic}'}, **extra)
    bank[area].append(q)
    return q

def read_rows(file):
    return [line.split('|') for line in (ROOT / file).read_text(encoding='utf-8').splitlines()
            if line and not line.startswith('#')]

rows = read_rows('practice/authoring/concepts.tsv')
assert len(rows) == 106
def situation(prompt):
    assert '. ' in prompt, prompt
    return prompt.rsplit('. ', 1)[0] + '.'
for i, (code, term, prompt, explanation) in enumerate(rows):
    area = 'software' if code.startswith('1.') else 'data'
    peers = [r for r in rows if r[0].startswith(code[:2]) and r[1] != term]
    # Do not offer a subtype as an alternative to its enclosing activity.
    if term == '데이터 모델링': peers = [r for r in peers if r[1] != '개념적 모델링']
    if term == '개념적 모델링': peers = [r for r in peers if r[1] != '데이터 모델링']
    if term == '유지보수 영향 분석': peers = [r for r in peers if r[1] != '추적성']
    if term == '추적성': peers = [r for r in peers if r[1] != '유지보수 영향 분석']
    # Nearby curriculum concepts provide actual, defined distractors.
    peers.sort(key=lambda r: (abs(rows.index(r) - i), r[0]))
    wrong = [(situation(r[2]), f'이 상황은 ‘{r[1]}’입니다. {r[3]}') for r in peers[:3]]
    if code == '1.1.1.1':
        wrong = [
            ('일단 실행되는 코드를 만든 뒤 검증과 변경 이력 관리는 생략한다.', '체계적인 검증과 변경 관리를 생략하면 품질과 유지보수성을 관리하기 어렵습니다.'),
            ('개발 활동의 공통 절차 없이 각 개발자의 경험에만 맡긴다.', '개인 경험만으로는 대규모 개발의 품질과 생산성을 일관되게 관리하기 어렵습니다.'),
            ('소프트웨어 품질은 사용 중 자연스럽게 좋아진다고 가정하고 결함을 측정하지 않는다.', '품질은 자동으로 보장되지 않으며 결함과 품질 특성을 확인하고 개선해야 합니다.')]
    add(area, code, syllabus_names[code.rsplit('.',1)[0]], f'다음 중 ‘{term}’의 핵심 의미를 가장 직접적으로 보여주는 상황은?', situation(prompt), wrong, explanation,
        f'‘{situation(prompt)}’가 해당합니다. {explanation}', kind='concept')

business = read_rows('practice/authoring/business-additions.tsv')
assert len(business) == 105
for i, (subject, code, term, prompt, explanation) in enumerate(business):
    peers = [r for r in business if r[0] == subject and r[2] != term]
    peers.sort(key=lambda r: abs(business.index(r) - i))
    add('business', code, syllabus_names[code.rsplit('.',1)[0]], prompt, term, [(r[2], r[4]) for r in peers[:3]],
        explanation, f'‘{term}’에 해당합니다. {explanation}', kind='scenario')

# Python: fixed input, structurally different operation compositions.
# Each option is an actually evaluated alternate program (omitted/reordered/replaced operation).
steps = [
    ('양수만 남기기', 'a = [x for x in a if x > 0]'),
    ('홀수만 남기기', 'a = [x for x in a if x % 2 != 0]'),
    ('절댓값으로 바꾸기', 'a = [abs(x) for x in a]'),
    ('부호 바꾸기', 'a = [-x for x in a]'),
    ('제곱하기', 'a = [x * x for x in a]'),
    ('역순으로 배치하기', 'a = a[::-1]'),
    ('오름차순 정렬하기', 'a = sorted(a)'),
    ('첫 등장 순서로 중복 제거하기', 'a = list(dict.fromkeys(a))'),
    ('첫 원소 제외하기', 'a = a[1:]'),
    ('인덱스가 짝수인 원소만 남기기', 'a = a[::2]'),
    ('앞뒤 절반을 교환하기', 'a = a[len(a)//2:] + a[:len(a)//2]'),
    ('누적합으로 바꾸기', 'a = [sum(a[:i+1]) for i in range(len(a))]'),
]
initial = [-2, 0, 3, -1, 3, 2]
step_help = [
    '0보다 큰 값만 남깁니다. 0과 음수는 제외합니다.',
    '2로 나눈 나머지가 0이 아닌 값만 남깁니다. 음수인 홀수도 포함합니다.',
    '음수는 양수로 바꾸고 0과 양수는 그대로 둡니다.',
    '각 값에 -1을 곱해 양수와 음수의 부호를 바꿉니다. 0은 그대로입니다.',
    '각 값에 자기 자신을 곱합니다. 예를 들어 -2의 제곱은 4입니다.',
    '값의 크기와 관계없이 지금 놓인 순서를 뒤집습니다.',
    '작은 값부터 큰 값 순서로 다시 놓습니다.',
    '같은 값이 여러 번 나오면 처음 나온 것 하나만 남깁니다.',
    '현재 리스트의 맨 앞 값 하나를 버리고 나머지를 남깁니다.',
    '위치를 0부터 셀 때 0·2·4번째 값을 남깁니다. 값 자체가 짝수인지 고르는 것은 아닙니다.',
    '현재 길이를 2로 나눈 몫을 경계로 앞뒤를 나누고 뒷부분을 먼저 놓습니다.',
    '각 위치를 처음부터 그 위치까지 더한 값으로 바꿉니다. [2, 3, 1]이면 [2, 5, 6]이 됩니다.'
]

def python_run(sequence):
    env = {'a': initial.copy()}
    trace = []
    for k in sequence:
        exec(steps[k][1], {}, env)
        trace.append(f'{len(trace)+1}단계 · {steps[k][0]}: {step_help[k]}\n결과 → {env["a"]}')
    return repr(env['a']), trace

python_candidates = []
python_target = targets['software'] - len(bank['software'])
for seq in it.permutations(range(len(steps)), 3):
    answer, trace = python_run(seq)
    # Every displayed operation must matter on this input. Reject ineffective compositions.
    mutations = []
    for p in range(3):
        out, _ = python_run(seq[:p] + seq[p+1:])
        if out != answer:
            mutations.append((out, f'{p+1}번째 단계인 ‘{steps[seq[p]][0]}’를 생략한 결과입니다.'))
    if len(mutations) < 3:
        continue
    for other in it.permutations(seq):
        out, _ = python_run(other)
        mutations.append((out, '연산 순서를 ' + ' → '.join(steps[k][0] for k in other) + '로 바꾼 결과입니다.'))
    for p in range(3):
        for replacement in range(len(steps)):
            other = seq[:p] + (replacement,) + seq[p+1:]
            out, _ = python_run(other)
            mutations.append((out, f'{p+1}번째 연산을 ‘{steps[replacement][0]}’로 바꾼 결과입니다.'))
    wrong = []
    seen = {answer}
    for out, why in mutations:
        if out not in seen:
            seen.add(out)
            wrong.append((out, why))
        if len(wrong) == 3:
            break
    if len(wrong) == 3:
        python_candidates.append((seq, answer, trace, wrong))

# Add four-stage compositions where three stages alone do not reach the allocation.
if len(python_candidates) < python_target:
    for seq in it.permutations(range(len(steps)), 4):
        answer, trace = python_run(seq)
        wrong = []
        seen = {answer}
        effective = 0
        for p in range(4):
            out, _ = python_run(seq[:p] + seq[p+1:])
            if out != answer: effective += 1
            if out not in seen:
                seen.add(out)
                wrong.append((out, f'{p+1}번째 ‘{steps[seq[p]][0]}’를 생략한 결과입니다.'))
        if effective == 4 and len(wrong) >= 3:
            python_candidates.append((seq, answer, trace, wrong[:3]))
        if len(python_candidates) >= python_target:
            break
assert len(python_candidates) >= python_target
for seq, answer, trace, wrong in python_candidates[:python_target]:
    code = f'a = {initial!r}\n' + '\n'.join(steps[k][1] for k in seq) + '\nprint(a)'
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        exec(code, {})
    assert output.getvalue().strip() == answer
    title = ' → '.join(steps[k][0] for k in seq)
    q = add('software', '1.5.2.2', '리스트 처리와 연산 순서',
            f'다음 Python 3 코드를 실행했을 때 마지막에 출력되는 리스트는?\n처리 순서: {title}',
            answer, wrong, '리스트는 값을 순서대로 담는 자료입니다. 각 줄은 바로 앞 단계에서 바뀐 리스트를 사용합니다. 조건에 맞는 값만 남기는 것이 필터, 값을 바꾸는 것이 변환입니다. 순서까지 바뀔 수 있으므로 매 단계의 결과를 적고 다음 줄로 넘어갑니다.',
            '\n'.join(trace) + f'\n따라서 출력은 {answer}입니다.', kind='code', code=code, language='Python 3',
            reference={'url': 'https://docs.python.org/3/tutorial/datastructures.html', 'title': 'Python 자료구조 공식 문서'})
    proofs.append({'id': q['id'], 'type': 'python', 'code': code, 'expected': answer})

# SQLite: fixed rows, distinct conditions/aggregates/grouping/null handling.
setup = '''CREATE TABLE sales(id INTEGER PRIMARY KEY, team TEXT, amount INTEGER, paid INTEGER);
INSERT INTO sales VALUES (1,'A',10,1),(2,'A',NULL,0),(3,'A',20,1),(4,'B',10,0),(5,'B',30,1),(6,'C',0,NULL),(7,'C',-10,1),(8,'C',20,0);
CREATE TABLE teams(name TEXT PRIMARY KEY);
INSERT INTO teams VALUES ('A'),('B'),('C'),('D');'''
db = sqlite3.connect(':memory:')
db.executescript(setup)
table = 'sales(id, team, amount, paid)의 전체 행:' + '\n' + '\n'.join(
    ' | '.join('NULL' if x is None else str(x) for x in row) for row in db.execute('SELECT * FROM sales ORDER BY id'))
predicates = [
    ('전체 행', '1=1'), ('결제 완료', 'paid=1'), ('미결제', 'paid=0'),
    ('결제 상태 미정', 'paid IS NULL'), ('금액 있음', 'amount IS NOT NULL'),
    ('금액 미정', 'amount IS NULL'), ('양수 금액', 'amount>0'), ('0 이하 금액', 'amount<=0'),
    ('A팀 제외', "team<>'A'"), ('10~20 금액', 'amount BETWEEN 10 AND 20'),
    ('금액 10 또는 미정', 'amount=10 OR amount IS NULL'),
    ('완료이면서 양수', 'paid=1 AND amount>0'),
    ('미완료 또는 미정', 'paid=0 OR paid IS NULL'),
    ('B팀 또는 완료', "team='B' OR paid=1"),
    ('금액 미정 제외 후 A팀 또는 양수', "amount IS NOT NULL AND (team='A' OR amount>0)"),
    ('다른 행과 금액 중복', 'amount IN (SELECT amount FROM sales GROUP BY amount HAVING COUNT(*)>1)'),
    ('평균 금액 초과', 'amount > (SELECT AVG(amount) FROM sales)'),
    ('같은 팀의 미결제 존재', 'EXISTS (SELECT 1 FROM sales s2 WHERE s2.team=sales.team AND s2.paid=0)'),
    ('같은 팀의 미결제 없음', 'NOT EXISTS (SELECT 1 FROM sales s2 WHERE s2.team=sales.team AND s2.paid=0)'),
    ('0 또는 10이 아닌 금액', 'amount NOT IN (0,10)'),
]
aggregates = [
    ('행 수', 'COUNT(*)', 'COUNT(*)는 남은 행 전체를 셉니다.'),
    ('금액이 있는 행 수', 'COUNT(amount)', 'COUNT(amount)는 NULL 금액을 제외합니다.'),
    ('서로 다른 금액 수', 'COUNT(DISTINCT amount)', '중복 금액과 NULL을 제외하고 셉니다.'),
    ('금액 합계', 'SUM(amount)', 'SUM은 NULL을 제외해 합산하고 입력이 없으면 NULL입니다.'),
    ('최대 금액', 'MAX(amount)', 'NULL을 제외한 최댓값이며 값이 없으면 NULL입니다.'),
    ('최소 금액', 'MIN(amount)', 'NULL을 제외한 최솟값이며 값이 없으면 NULL입니다.'),
    ('NULL을 0으로 바꾼 합계', 'SUM(COALESCE(amount,0))', '각 행의 NULL을 0으로 바꾼 후 합산합니다. 행 자체가 없으면 합계는 NULL입니다.'),
    ('완료 건수', 'SUM(CASE WHEN paid=1 THEN 1 ELSE 0 END)', '완료 행은 1, 나머지는 0으로 바꿔 합산합니다.'),
    ('미정 금액 건수', 'SUM(CASE WHEN amount IS NULL THEN 1 ELSE 0 END)', '금액이 NULL인 행은 1, 나머지는 0으로 바꿔 합산합니다.'),
    ('결제 상태 종류 수', 'COUNT(DISTINCT paid)', '중복과 NULL을 제외한 결제 상태의 종류 수입니다.'),
    ('양수 금액 합계', 'SUM(CASE WHEN amount>0 THEN amount ELSE 0 END)', '양수만 더하고 다른 행은 0으로 처리합니다.'),
    ('결제 완료 금액 합계', 'SUM(CASE WHEN paid=1 THEN amount ELSE 0 END)', '완료 행의 금액을 합산하고 나머지 행은 0으로 처리합니다.'),
]

def sql_result(sql):
    result = list(db.execute(sql))
    return '결과 행 없음' if not result else '\n'.join(' | '.join('NULL' if x is None else str(x) for x in row) for row in result)

sql_candidates = []
for grouped in [False, True]:
    for pred_name, pred in predicates:
        for agg_name, agg, principle in aggregates:
            tail = ' GROUP BY team ORDER BY team' if grouped else ''
            sql = f'SELECT {"team, " if grouped else ""}{agg} FROM sales WHERE {pred}{tail};'
            sql_candidates.append((sql, pred, agg, principle, grouped, None))
for pred_name, pred in predicates:
    for agg_name, agg, principle in aggregates:
        for having in ['COUNT(*)>=2', 'COUNT(amount)=COUNT(*)', 'SUM(amount)>10']:
            sql = f'SELECT team, {agg} FROM sales WHERE {pred} GROUP BY team HAVING {having} ORDER BY team;'
            sql_candidates.append((sql, pred, agg, principle, True, having))
sql_target = targets['data'] - len(bank['data'])
assert len(sql_candidates) >= sql_target
for sql, pred, agg, principle, grouped, having in sql_candidates[:sql_target]:
    answer = sql_result(sql)
    mutations = [
        (sql.replace(f'WHERE {pred}', 'WHERE 1=1'), 'WHERE 필터를 적용하지 않은 결과입니다.'),
        (sql.replace(agg, 'COUNT(*)', 1), '요구한 집계식 대신 COUNT(*)로 행 수를 센 결과입니다.'),
        (sql.replace(agg, 'SUM(amount)', 1), '요구한 집계식 대신 SUM(amount)로 금액을 합산한 결과입니다.'),
        (sql.replace(agg, 'MAX(amount)', 1), '요구한 집계식 대신 MAX(amount)로 최댓값을 구한 결과입니다.'),
        (sql.replace(f'WHERE {pred}', f'WHERE NOT ({pred})'), 'WHERE 조건의 참과 거짓을 반대로 적용한 결과입니다. NULL의 UNKNOWN은 참으로 바뀌지 않습니다.'),
    ]
    if having:
        mutations.insert(0, (sql.replace(' HAVING '+having, ''), 'HAVING의 그룹 필터를 생략한 결과입니다.'))
    for _, other, _ in aggregates:
        mutations.append((sql.replace(agg, other, 1), f'집계식을 {other}로 바꾼 결과입니다.'))
    for _, other in predicates:
        mutations.append((sql.replace(f'WHERE {pred}', f'WHERE {other}'), f'WHERE 조건을 {other}로 바꾼 결과입니다.'))
    for _, other, _ in aggregates:
        mutations.append((sql.replace(agg, other, 1).replace(f'WHERE {pred}', 'WHERE 1=1'),
                          f'WHERE 필터를 생략하고 집계식을 {other}로 바꾼 결과입니다.'))
    wrong = []
    seen = {answer}
    for other, why in mutations:
        out = sql_result(other)
        if out not in seen:
            seen.add(out)
            wrong.append((out, why))
        if len(wrong) == 3:
            break
    assert len(wrong) == 3, sql
    filtered = sql_result(f'SELECT id, team, amount, paid FROM sales WHERE {pred} ORDER BY id')
    code = table + '\n\n실행할 SQL (SQLite 3):\n' + sql
    selected_rows = list(db.execute(f'SELECT id, team, amount, paid FROM sales WHERE {pred} ORDER BY id'))
    group_trace = []
    group_names = sorted({row[1] for row in selected_rows}) if grouped else [None]
    for name in group_names:
        members = [row for row in selected_rows if name is None or row[1] == name]
        condition = pred if name is None else f'({pred}) AND team={repr(name)}'
        value = sql_result(f'SELECT {agg} FROM sales WHERE {condition}')
        group_trace.append(f'{name+"팀" if name else "전체"}: 남은 행 번호 {[row[0] for row in members]}, 금액 {[row[2] if row[2] is not None else "NULL" for row in members]} → {agg} 결과 {value}')
    q = add('data', '2.3.2.4', 'SQL 조건·NULL·집계',
            '아래 표의 데이터만 있는 sales에서 SQL을 실행한 결과는? 행은 표시된 순서로 비교하고 NULL은 값이 없음을 뜻합니다.',
            answer, wrong, 'NULL은 값이 없거나 아직 정해지지 않은 상태이며 숫자 0과 다릅니다. WHERE는 조건이 참인 행만 남깁니다. GROUP BY가 있으면 같은 팀을 묶고, 집계 함수로 개수·합계 등을 계산한 뒤 HAVING으로 그룹을 고릅니다. ' + principle,
            f'1. WHERE를 통과한 행(id | team | amount | paid):\n{filtered}\n2. 남은 자료로 집계하기:\n'+ '\n'.join(group_trace) + f'\n{principle}\n'+
            (f'HAVING {having} 조건을 만족하는 그룹만 유지합니다.\n' if having else '') + f'최종 결과:\n{answer}',
            kind='sql', code=code, language='SQL', reference={'url':'https://www.sqlite.org/lang_select.html','title':'SQLite SELECT 공식 문서'})
    proofs.append({'id':q['id'],'type':'sql','setup':setup,'query':sql,'expected':answer})

# Page references use canonical equality patterns, not renamed copies.
def canonical(seq):
    names = {}
    return tuple(names.setdefault(v, len(names)) for v in seq)

def page_trace(seq, policy):
    frames = []
    used = {}
    faults = 0
    trace = []
    for i, page in enumerate(seq):
        hit = page in frames
        if not hit:
            faults += 1
            if len(frames) == 3:
                if policy == 'FIFO': victim = frames[0]
                elif policy == 'LRU': victim = min(frames, key=lambda v: used[v])
                else:
                    def future(v):
                        try: return seq[i+1:].index(v)
                        except ValueError: return float('inf')
                    victim = max(frames, key=future)
                frames.remove(victim)
            frames.append(page)
        used[page] = i
        trace.append(f'{i+1}번째 · 페이지 {page}: {"이미 메모리에 있어 그대로 사용" if hit else "메모리에 없어 가져옴"}, 보유 페이지 {sorted(frames)}, 누적 부재 {faults}회')
    return faults, trace

patterns = [p for p in it.product(range(4), repeat=7) if p == canonical(p) and len(set(p)) == 4]
page_cases = []
for seq in patterns:
    results = {policy:page_trace(seq,policy) for policy in ['FIFO','LRU','OPT']}
    if len({v[0] for v in results.values()}) < 2: continue
    for policy in results: page_cases.append((seq,policy,results[policy]))
assert len(page_cases) >= 120
for seq, policy, (answer, trace) in page_cases[:120]:
    rules = {'FIFO':'가장 먼저 적재된 페이지를 교체하며 적중 시 적재 순서를 바꾸지 않습니다.',
             'LRU':'가장 오랫동안 참조되지 않은 페이지를 교체합니다.',
             'OPT':'앞으로 가장 늦게 참조되거나 다시 참조되지 않는 페이지를 교체합니다.'}
    q = add('systems-security','3.2.1.2','페이지 교체와 참조 순서',
            f'처음에 비어 있는 페이지 프레임 3개를 사용합니다. 참조열은 {list(seq)}이고 {policy} 정책을 적용합니다. 최초 적재도 부재로 셀 때 전체 페이지 부재 횟수는?',
            f'{answer}회', [(f'{n}회',f'단계별 부재 표시를 합하면 {answer}회입니다. {n}회는 아래 참조 기록과 일치하지 않습니다.') for n in range(3,8) if n!=answer][:3],
            '페이지는 메모리를 관리하는 일정한 크기의 단위이고, 프레임은 페이지를 담는 자리입니다. 필요한 페이지가 없어서 가져오는 일을 페이지 부재라고 셉니다. 자리가 가득 차면 하나를 내보내야 합니다. ' + rules[policy] + ' 아래 보유 목록은 확인하기 쉽게 번호순으로 표시한 것이며 교체 순서를 뜻하지 않습니다.', '\n'.join(trace),kind='trace')
    proofs.append({'id':q['id'],'type':'pages','sequence':seq,'policy':policy,'expected':answer})

def schedule(order, arrivals, policy):
    burst = {'A':3,'B':1,'C':4,'D':2}
    arrival = dict(zip(order,arrivals))
    remaining = burst.copy()
    finish = {}
    trace = []
    time = 0
    ready = []
    while len(finish)<4:
        eligible = [p for p in order if arrival[p]<=time and p not in finish]
        if not eligible:
            time += 1
            continue
        if policy=='FCFS': p=min(eligible,key=lambda p:(arrival[p],order.index(p)))
        elif policy=='SJF': p=min(eligible,key=lambda p:(remaining[p],arrival[p],order.index(p)))
        else: p=min(eligible,key=lambda p:(remaining[p],arrival[p],order.index(p)))
        duration = 1 if policy=='SRTF' else remaining[p]
        trace.append(f'{time}~{time+duration}: {p}')
        time += duration
        remaining[p] -= duration
        if remaining[p]==0: finish[p]=time
    waits = {p:finish[p]-arrival[p]-burst[p] for p in order}
    return sum(waits.values()),trace,waits

sched_cases = []
for order in it.permutations('ABCD'):
    for arrivals in [(0,0,0,0),(0,1,2,3),(0,0,1,1),(0,2,2,4)]:
        for policy in ['FCFS','SJF','SRTF']:
            result = schedule(order,arrivals,policy)
            sched_cases.append((order,arrivals,policy,result))
for order,arrivals,policy,(answer,trace,waits) in sched_cases[:80]:
    jobs = ', '.join(f'{p}(도착 {a}, CPU {dict(A=3,B=1,C=4,D=2)[p]})' for p,a in zip(order,arrivals))
    rule = {'FCFS':'먼저 도착한 순서로 비선점 실행합니다.', 'SJF':'CPU가 비었을 때 준비된 작업 중 CPU 시간이 가장 짧은 작업을 비선점 실행합니다.', 'SRTF':'매 시간 단위 경계에서 준비된 작업 중 남은 시간이 가장 짧은 작업을 실행하고 필요하면 선점합니다.'}[policy]
    q = add('systems-security','3.2.2.2','CPU 스케줄링',
            f'작업은 {jobs}입니다. {policy}를 사용하며 {rule} 동률이면 먼저 도착한 작업, 도착도 같으면 제시된 작업 순서를 따릅니다. 문맥 교환 비용과 입출력은 없고 단위는 ms입니다. 네 작업의 대기시간 합은?',
            f'{answer}ms', [(f'{n}ms',f'각 작업의 완료−도착−CPU 시간을 합하면 {answer}ms입니다. {n}ms는 실행 기록에서 계산한 대기시간 합과 다릅니다.') for n in [answer+4,answer+10,answer+1]],
            'CPU 스케줄링은 실행할 작업의 순서를 정하는 것입니다. 비선점은 시작한 작업을 끝날 때까지 실행하고, 선점은 도중에 다른 작업으로 바꿀 수 있다는 뜻입니다. 이 문제에는 입출력 대기가 없으므로 대기시간은 완료시각에서 도착시각과 실제 CPU 실행시간을 뺀 값입니다.',
            '실행 구간:\n'+'\n'.join(trace)+'\n작업별 계산:\n'+ '\n'.join(f'{p}: 완료 {a+dict(A=3,B=1,C=4,D=2)[p]+waits[p]} − 도착 {a} − 실행 {dict(A=3,B=1,C=4,D=2)[p]} = 대기 {waits[p]}ms' for p,a in zip(order,arrivals)) +f'\n합계는 {answer}ms입니다.', kind='trace')
    proofs.append({'id':q['id'],'type':'schedule','order':order,'arrivals':arrivals,'policy':policy,'expected':answer})

# Access decisions: changed rule precedence and combinations of subject attributes.
rules = [
    ('관리 기기가 아니면 거부',lambda staff,managed,mfa,hours: not managed,False),
    ('직원이면서 MFA를 완료했으면 허용',lambda staff,managed,mfa,hours:staff and mfa,True),
    ('업무시간 밖이면 거부',lambda staff,managed,mfa,hours:not hours,False),
    ('업무시간이고 관리 기기이면 허용',lambda staff,managed,mfa,hours:hours and managed,True),
    ('직원이 아니면 거부',lambda staff,managed,mfa,hours:not staff,False),
    ('MFA를 완료하지 않았으면 거부',lambda staff,managed,mfa,hours:not mfa,False),
]
security_cases = []
security_paths = set()
for order in it.permutations(range(len(rules))):
    for attrs in it.product([False,True],repeat=4):
        matched = [i for i,k in enumerate(order,1) if rules[k][1](*attrs)]
        if len(matched)<2: continue
        first = matched[0]
        granted = rules[order[first-1]][2]
        # Keep overlapping rules with contradictory decisions: ordering matters.
        if len({rules[order[i-1]][2] for i in matched})<2: continue
        path = (attrs, order[:first])
        if path in security_paths: continue
        security_paths.add(path)
        security_cases.append((order,attrs,matched,first,granted))
assert len(security_cases)>=205,len(security_cases)
for order,attrs,matched,first,granted in security_cases[:205]:
    policy = '\n'.join(f'{i}. {rules[k][0]}' for i,k in enumerate(order,1))
    desc = ', '.join(f'{label}: {"예" if value else "아니오"}' for label,value in zip(['직원','관리 기기','MFA 완료','업무시간'],attrs))
    result = f'{first}번 규칙 · {"허용" if granted else "거부"}'
    wrong = []
    for i in range(1,len(order)+1):
        other = f'{i}번 규칙 · {"허용" if rules[order[i-1]][2] else "거부"}'
        if other==result:continue
        why = '조건을 만족하지만 앞선 규칙에서 이미 결정되므로 적용하지 않습니다.' if i in matched else '이 요청은 해당 규칙의 조건을 만족하지 않습니다.'
        wrong.append((other,why))
    trace = '\n'.join(f'{i}번: {"조건 충족" if i in matched else "조건 불충족"}' for i in range(1,first+1))
    q = add('systems-security','3.6.1.3','접근통제 규칙의 우선순위',
            f'다음은 연습용 접근 정책입니다. 위에서 아래로 검사하여 처음 조건이 맞는 규칙 하나로 결정하고 이후 규칙은 평가하지 않습니다. 일치하는 규칙이 없으면 거부합니다.\n{policy}\n요청 속성: {desc}\n적용되는 규칙과 결정은?',
            result,wrong[:3],'접근통제는 요청자가 해당 자료나 기능을 사용해도 되는지 결정하는 것입니다. 이 문제의 최초 일치 정책은 위에서부터 읽다가 처음 맞는 규칙에서 멈춥니다. 실제 시스템마다 정책이 다르므로 지문에 제시한 순서를 따릅니다. MFA는 비밀번호와 보유 기기처럼 서로 다른 종류의 확인 수단을 함께 사용하는 다중 요소 인증입니다. 관리 기기는 조직이 관리 대상으로 등록한 기기를 뜻합니다.',
            trace+f'\n최초로 일치하는 {first}번에서 멈추므로 ‘{result}’입니다. 이후 규칙은 적용하지 않습니다.',kind='policy')
    proofs.append({'id':q['id'],'type':'policy','order':order,'attributes':attrs,'expected':result})

assert {a:len(q) for a,q in bank.items()} == targets
allq=[q for qs in bank.values() for q in qs]
assert len({q['id'] for q in allq})==3000
assert len({(q['prompt'],q.get('code','')) for q in allq})==3000
for a in ['business','systems-security']:
    assert json.dumps(bank[a][:300],ensure_ascii=False,sort_keys=True)==original[a]
for area, qs in bank.items():
    (DATA / f'{area}.json').write_text(json.dumps(qs,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(ROOT / 'practice/authoring/execution-proofs.json').write_text(json.dumps(proofs,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'counts':targets,'authored_concepts':len(rows),'authored_scenarios':len(business),'executed_exercises':len(proofs)},ensure_ascii=False))
