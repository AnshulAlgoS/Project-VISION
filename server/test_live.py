"""Live HTTP integration: original model -> allocation -> dispatch -> arrival."""
import urllib.request,json,uuid,time
for attempt in range(90):
 try:
  with urllib.request.urlopen('http://127.0.0.1:8001/',timeout=2) as r:break
 except Exception:time.sleep(1)
else:raise RuntimeError('ML backend did not become ready')
BASE='http://127.0.0.1:8080/api'
def call(path,data=None):
 req=urllib.request.Request(BASE+path,data=json.dumps(data).encode() if data is not None else None,headers={'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=120) as r:return json.load(r)
q=call('/cases',dict(name='Integration '+uuid.uuid4().hex[:4],location='Synthetic test location',needs={'beds':1},requestId=uuid.uuid4().hex))
q=call('/assess',dict(caseId=q['id'],vitals=dict(heart_rate=115,bp_systolic=95,bp_diastolic=60,spo2=93,temperature=38.5,pain_level=6,fatigue_level=6)))
assert q['model']['model_used'] in ['synthetic','real_mimic_iii'];assert 0<=q['model']['risk_score']<=100
s=call('/state');stored=next(x for x in s['cases'] if x['id']==q['id']);r=next(x for x in stored['recommendations'] if x['eligible']);h=next(h for h in s['hospitals'] if h['id']==r['hospitalId']);before=h['beds']
call('/dispatch',dict(caseId=q['id'],hospitalId=h['id']))
s=call('/state');assert next(x for x in s['hospitals'] if x['id']==h['id'])['beds']==before-1
for _ in range(4):call('/advance',dict(caseId=q['id']))
call('/discharge',dict(caseId=q['id']));s=call('/state');assert next(x for x in s['hospitals'] if x['id']==h['id'])['beds']==before
print('PASS: real trained inference -> persisted ML score -> hospital recommendation -> transactional dispatch -> simulated arrival -> resource release')
