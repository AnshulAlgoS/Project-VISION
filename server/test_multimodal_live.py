"""Usage: python3 server/test_multimodal_live.py FACE_IMAGE VOICE_WAV
Use consenting/public fixture media and synthetic vitals only.
"""
import sys,json,uuid,urllib.request,os
from pathlib import Path
BASE=os.getenv('VISION_TEST_BASE','http://127.0.0.1:8080/api')
def call(path,data=None):
 req=urllib.request.Request(BASE+path,data=json.dumps(data).encode() if data is not None else None,headers={'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=120) as r:return json.load(r)
q=call('/cases',dict(name='MULTIMODAL TEST '+uuid.uuid4().hex[:4],location='Synthetic test site',requestId=uuid.uuid4().hex,needs={'beds':1}))
vitals=dict(heart_rate=115,bp_systolic=95,bp_diastolic=60,spo2=93,temperature=38.5,pain_level=6,fatigue_level=6)
boundary='vision'+uuid.uuid4().hex;parts=[]
def add(name,raw,filename=None,mime=None):
 header=f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"'
 if filename:header+=f'; filename="{filename}"'
 if mime:header+='\r\nContent-Type: '+mime
 parts.append(header.encode()+b'\r\n\r\n'+raw+b'\r\n')
add('vitals',json.dumps(vitals).encode())
add('face_video',Path(sys.argv[1]).read_bytes(),'face.jpg','image/jpeg')
add('voice_sample',Path(sys.argv[2]).read_bytes(),'voice.wav','audio/wav')
body=b''.join(parts)+f'--{boundary}--\r\n'.encode()
req=urllib.request.Request(BASE+'/assess-multimodal?caseId='+q['id'],data=body,headers={'Content-Type':'multipart/form-data; boundary='+boundary})
try:
 with urllib.request.urlopen(req,timeout=180) as r:q=json.load(r)
except urllib.error.HTTPError as e:
 print("HTTP",e.code,e.read(350).decode(errors="replace"));raise
model=q['model'];assert {x['modality'] for x in model['signals']}=={'face','voice','vitals'},model
assert model['details']['face_fatigue_index']['model_used']=='trained_face_cnn'
assert model['details']['voice_stress_score']['model_used']=='trained_voice'
s=call('/state');q=next(x for x in s['cases'] if x['id']==q['id']);assert q['model']['risk_score']==model['risk_score'];h=next(x for x in q['recommendations'] if x['eligible'])
call('/dispatch',dict(caseId=q['id'],hospitalId=h['hospitalId']))
for _ in range(4):call('/advance',dict(caseId=q['id']))
call('/discharge',dict(caseId=q['id']))
print('PASS: face CNN + trained voice + trained vitals -> fusion -> persisted allocation -> dispatch -> arrival -> discharge')
print(json.dumps({k:model[k] for k in ['risk_score','signals','excluded']},indent=2))
