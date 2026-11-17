import sqlite3,json,math,uuid,os
import urllib.request,urllib.error
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from pathlib import Path
DB=Path(os.getenv('VISION_DB_PATH',str(Path(__file__).with_name('vision.db'))))
DB.parent.mkdir(parents=True,exist_ok=True)
def conn():
 c=sqlite3.connect(DB,timeout=15);c.row_factory=sqlite3.Row;return c
def init():
 with conn() as c:
  c.execute('CREATE TABLE IF NOT EXISTS state(id INTEGER PRIMARY KEY,data TEXT NOT NULL)')
  if c.execute('SELECT id FROM state').fetchone():return
  hospitals=[dict(id='h1',name='Wakanda Central',lat=28.6139,lng=77.209,icu=2,beds=12,ventilators=2,oxygen=40,blood=18,er=16,erCapacity=20),dict(id='h2',name='Stark Medical Centre',lat=28.629,lng=77.219,icu=5,beds=20,ventilators=4,oxygen=80,blood=24,er=7,erCapacity=20),dict(id='h3',name='Shuri Regional Hospital',lat=28.598,lng=77.229,icu=0,beds=8,ventilators=0,oxygen=12,blood=6,er=18,erCapacity=20)]
  state=dict(hospitals=hospitals,ambulances=[dict(id='a1',name='QUINJET 01',lat=28.615,lng=77.205,status='available',caseId=None),dict(id='a2',name='QUINJET 02',lat=28.635,lng=77.225,status='available',caseId=None),dict(id='a3',name='QUINJET 03',lat=28.601,lng=77.21,status='available',caseId=None)],cases=[],transfers=[],events=[])
  c.execute('INSERT INTO state VALUES(1,?)',(json.dumps(state),))
def distance(a,b):return round(math.hypot((a['lat']-b['lat'])*111,(a['lng']-b['lng'])*98),2)
def recommend(s,q):
 out=[]
 for h in s['hospitals']:
  missing=[k for k,v in q['needs'].items() if h.get(k,0)<v]
  if h['er']>=h['erCapacity']:missing.append('ER capacity')
  km=distance(q,h);score=round(km*(2+q.get('model',{}).get('risk_score',0)/50)+h['er']/h['erCapacity']*12,2)
  out.append(dict(hospitalId=h['id'],name=h['name'],eligible=not missing,missing=missing,distance=km,eta=max(2,math.ceil(km/0.5)),score=score,reason=f"{km} km away; ER {h['er']}/{h['erCapacity']}; "+('all requested resources available' if not missing else 'Unavailable: '+', '.join(missing))))
 return sorted(out,key=lambda x:(not x['eligible'],x['score']))
def num(b,k,default=0,maximum=999):
 v=b.get(k,default)
 if isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v) or v<0 or v>maximum or int(v)!=v:raise ValueError('Invalid '+k)
 return int(v)
def coords(b):
 lat=float(b.get('lat',28.6139));lng=float(b.get('lng',77.209))
 if not math.isfinite(lat) or not math.isfinite(lng) or not -90<=lat<=90 or not -180<=lng<=180:raise ValueError('Invalid coordinates')
 return dict(lat=lat,lng=lng)
def find(rows,id):
 r=next((x for x in rows if x['id']==id),None)
 if not r:raise ValueError('Record not found')
 return r
def action(s,path,b):
 if path=='/cases':
  if b.get('requestId'):
   old=next((q for q in s['cases'] if q.get('requestId')==b['requestId']),None)
   if old:return old
  name=str(b.get('name','')).strip();location=str(b.get('location','')).strip()
  if not name or not location:raise ValueError('Name and location required')
  urgency=b.get('urgency','urgent')
  if urgency not in ['critical','urgent','routine']:raise ValueError('Invalid priority')
  needs={k:num(b.get('needs',{}),k,0,10) for k in ['beds','icu','ventilators','oxygen','blood']}
  if not needs['beds'] and not needs['icu']:needs['beds']=1
  q=dict(id=uuid.uuid4().hex[:8],requestId=b.get('requestId'),name=name[:80],location=location[:160],note=str(b.get('note',''))[:500],urgency=urgency,needs=needs,status='requested',hospitalId=None,ambulanceId=None,progress=0,**coords(b));s['cases'].insert(0,q);return q
 if path=='/attach-model':
  q=find(s['cases'],b.get('caseId'))
  if q['status']!='requested':raise ValueError('Assess before dispatch')
  q['model']=b['model'];return q
 if path=='/dispatch':
  q=find(s['cases'],b.get('caseId'))
  if q['status']!='requested':raise ValueError('Case already dispatched')
  h=find(s['hospitals'],b.get('hospitalId'));option=next(x for x in recommend(s,q) if x['hospitalId']==h['id'])
  if not option['eligible']:raise ValueError('Hospital no longer has required capacity')
  available=[a for a in s['ambulances'] if a['status']=='available']
  if not available:raise ValueError('No ambulance available')
  a=min(available,key=lambda a:distance(a,q))
  for k,v in q['needs'].items():h[k]-=v
  h['er']+=1;q.update(status='dispatched',hospitalId=h['id'],ambulanceId=a['id'],start=dict(lat=a['lat'],lng=a['lng']));a.update(status='dispatched',caseId=q['id']);return q
 if path=='/advance':
  q=find(s['cases'],b.get('caseId'));a=find(s['ambulances'],q.get('ambulanceId'));h=find(s['hospitals'],q.get('hospitalId'))
  if q['status'] not in ['dispatched','transporting']:raise ValueError('Case is not in transit')
  q['progress']=min(100,q['progress']+25);q['status']='transporting' if q['progress']<100 else 'arrived'
  start=q['start'];t=q['progress']/100;a.update(lat=round(start['lat']+(h['lat']-start['lat'])*t,5),lng=round(start['lng']+(h['lng']-start['lng'])*t,5),status='transporting' if t<1 else 'available',caseId=q['id'] if t<1 else None);return q
 if path=='/discharge':
  q=find(s['cases'],b.get('caseId'))
  if q['status']!='arrived':raise ValueError('Patient must have arrived')
  h=find(s['hospitals'],q['hospitalId'])
  for k in ['beds','icu','ventilators']:h[k]+=q['needs'][k]
  h['er']=max(0,h['er']-1);q['status']='closed';return q
 if path=='/resources':
  h=find(s['hospitals'],b.get('hospitalId'))
  for k in ['beds','icu','ventilators','oxygen','blood','er']:h[k]=num(b,k,h[k])
  if h['er']>h['erCapacity']:raise ValueError('ER load exceeds capacity')
  return h
 if path=='/transfers':
  source=find(s['hospitals'],b.get('source'));target=find(s['hospitals'],b.get('target'))
  if source['id']==target['id']:raise ValueError('Choose different hospitals')
  kind=b.get('kind','supply');item=b.get('item');amount=num(b,'amount',1,100)
  if amount<1:raise ValueError('Quantity must be positive')
  if kind=='patient':
   q=find(s['cases'],b.get('caseId'))
   if q['hospitalId']!=source['id'] or q['status']!='arrived':raise ValueError('Choose an arrived patient at source hospital')
   if not next(x for x in recommend(s,q) if x['hospitalId']==target['id'])['eligible']:raise ValueError('Destination lacks required capacity')
   a=next((a for a in s['ambulances'] if a['status']=='available'),None)
   if not a:raise ValueError('No ambulance available')
   for k,v in q['needs'].items():target[k]-=v
   for k in ['beds','icu','ventilators']:source[k]+=q['needs'][k]
   source['er']=max(0,source['er']-1);target['er']+=1;q.update(hospitalId=target['id'],ambulanceId=a['id'],status='dispatched',progress=0,start=dict(lat=source['lat'],lng=source['lng']));a.update(status='dispatched',caseId=q['id'],lat=source['lat'],lng=source['lng'])
  elif kind=='supply':
   if item not in ['oxygen','blood','ventilators']:raise ValueError('Invalid supply')
   if source[item]<amount:raise ValueError('Insufficient source stock')
   source[item]-=amount
  else:raise ValueError('Invalid transfer kind')
  t=dict(id=uuid.uuid4().hex[:8],kind=kind,source=source['id'],target=target['id'],item=item,amount=amount,caseId=b.get('caseId'),status='in_transit');s['transfers'].insert(0,t);return t
 if path=='/receive':
  t=find(s['transfers'],b.get('id'))
  if t['status']!='in_transit':raise ValueError('Transfer already received')
  if t['kind']=='patient':
   if find(s['cases'],t['caseId'])['status'] not in ['arrived','closed']:raise ValueError('Advance patient ambulance to arrival first')
  else:find(s['hospitals'],t['target'])[t['item']]+=t['amount']
  t['status']='received';return t
 raise ValueError('Unknown action')
class Handler(BaseHTTPRequestHandler):
 def respond(self,data,status=200):
  raw=json.dumps(data).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
 def do_GET(self):
  if self.path=='/health':return self.respond(dict(status='ok',mode='local simulation'))
  if self.path=='/state':
   with conn() as c:s=json.loads(c.execute('SELECT data FROM state').fetchone()[0])
   for q in s['cases']:q['recommendations']=recommend(s,q)
   return self.respond(s)
  self.proxy()
 def proxy(self,body=None):
  try:
   req=urllib.request.Request('http://127.0.0.1:8001'+self.path,data=body,headers={'Content-Type':self.headers.get('Content-Type','application/json')},method=self.command)
   with urllib.request.urlopen(req,timeout=90) as r:
    raw=r.read();self.send_response(r.status);self.send_header('Content-Type',r.headers.get('Content-Type','application/json'));self.end_headers();self.wfile.write(raw)
  except urllib.error.HTTPError as e:self.respond({'error':e.read().decode()},e.code)
  except Exception:self.respond({'error':'Clinical ML backend unavailable on port 8001'},503)
 def do_POST(self):
  try:
   length=int(self.headers.get('Content-Length',0))
   if length>30*1024*1024:raise ValueError('Request too large')
   raw=self.rfile.read(length)
   if self.path.startswith('/assess-multimodal?'):
    from urllib.parse import urlparse,parse_qs
    case_id=parse_qs(urlparse(self.path).query).get('caseId',[''])[0]
    try:
     req=urllib.request.Request('http://127.0.0.1:8001/analyze/multimodal',data=raw,headers={'Content-Type':self.headers.get('Content-Type','')})
     with urllib.request.urlopen(req,timeout=120) as r:analysis=json.load(r)
     details=analysis['data'];model=dict(details['fusion'])
     model['analysis_id']=analysis['patient_id'];model['details']=details
    except Exception as e:raise ValueError('Multimodal assessment failed: '+str(e))
    with conn() as c:
     c.execute('BEGIN IMMEDIATE');s=json.loads(c.execute('SELECT data FROM state').fetchone()[0]);result=action(s,'/attach-model',{'caseId':case_id,'model':model});s['events'].insert(0,dict(action='/multimodal-assessment',record=case_id,id=uuid.uuid4().hex[:8]));c.execute('UPDATE state SET data=? WHERE id=1',(json.dumps(s),))
    return self.respond(result)
   if self.path not in ['/cases','/dispatch','/advance','/discharge','/resources','/transfers','/receive','/assess']:return self.proxy(raw)
   b=json.loads(raw)
   if self.path=='/assess':
    try:
     req=urllib.request.Request('http://127.0.0.1:8001/analyze/vitals',data=json.dumps(b['vitals']).encode(),headers={'Content-Type':'application/json'})
     with urllib.request.urlopen(req,timeout=30) as r:model=json.load(r)['data']
     if model.get('error') or 'risk_score' not in model:raise ValueError('Vitals model unavailable')
    except Exception as e:raise ValueError('Model assessment failed: '+str(e))
    b={'caseId':b.get('caseId'),'model':model};self.path='/attach-model'
   with conn() as c:
    c.execute('BEGIN IMMEDIATE');s=json.loads(c.execute('SELECT data FROM state').fetchone()[0]);result=action(s,self.path,b);s['events'].insert(0,dict(action=self.path,record=result.get('id',''),id=uuid.uuid4().hex[:8]));s['events']=s['events'][:100];c.execute('UPDATE state SET data=? WHERE id=1',(json.dumps(s),))
   self.respond(result)
  except (ValueError,TypeError,KeyError,StopIteration) as e:self.respond(dict(error=str(e) or 'Invalid request'),409)
init()
if __name__=='__main__':ThreadingHTTPServer(('127.0.0.1',8000),Handler).serve_forever()
