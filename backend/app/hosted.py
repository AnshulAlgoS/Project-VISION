"""Single-process deployment entrypoint: clinical ML and coordination API."""
import importlib.util,json,uuid
from pathlib import Path
from typing import Optional
from fastapi import HTTPException,Form,File,UploadFile
from app.main import app,VitalsInput,analyze_patient_vitals,analyze_multimodal
from app.models.vitals import model as vitals_model
from app.models.face import face_analyzer
from app.models.voice import model as voice_model
spec=importlib.util.spec_from_file_location("vision_coordination",Path(__file__).resolve().parents[2]/"server"/"main.py")
coord=importlib.util.module_from_spec(spec)
spec.loader.exec_module(coord)

def mutate(path,payload):
 try:
  with coord.conn() as c:
   c.execute("BEGIN IMMEDIATE")
   state=json.loads(c.execute("SELECT data FROM state WHERE id=1").fetchone()[0])
   result=coord.action(state,path,payload)
   state['events'].insert(0,dict(action=path,record=result.get('id',''),id=uuid.uuid4().hex[:8]))
   state['events']=state['events'][:100]
   c.execute("UPDATE state SET data=? WHERE id=1",(json.dumps(state),))
  return result
 except (ValueError,TypeError,KeyError,StopIteration) as exc:raise HTTPException(409,detail=str(exc) or 'Invalid request')

@app.get('/health')
def readiness():
 ready=vitals_model is not None and face_analyzer.model_loaded and voice_model is not None
 if not ready:raise HTTPException(503,detail='One or more trained models unavailable')
 return {'status':'ok','models':{'vitals':True,'face':True,'voice':True}}

@app.get('/state')
def state():
 with coord.conn() as c:data=json.loads(c.execute('SELECT data FROM state WHERE id=1').fetchone()[0])
 for case in data['cases']:case['recommendations']=coord.recommend(data,case)
 return data

@app.post('/assess')
def assess(payload:dict):
 result=analyze_patient_vitals(VitalsInput(**payload['vitals']))['data']
 return mutate('/attach-model',dict(caseId=payload.get('caseId'),model=result))

@app.post('/assess-multimodal')
async def assess_multimodal(caseId:str,vitals:str=Form(...),face_video:Optional[UploadFile]=File(None),voice_sample:Optional[UploadFile]=File(None)):
 for sample in (face_video,voice_sample):
  if sample and sample.size is not None and sample.size>25*1024*1024:raise HTTPException(413,detail='Media must be under 25MB per file')
 analysis=await analyze_multimodal(vitals=vitals,face_video=face_video,voice_sample=voice_sample)
 if 'data' not in analysis or 'fusion' not in analysis['data']:raise HTTPException(422,detail='No usable multimodal assessment')
 details=analysis['data'];model=dict(details['fusion']);model.update(analysis_id=analysis['patient_id'],details=details)
 return mutate('/attach-model',dict(caseId=caseId,model=model))

def endpoint(path):
 def handler(payload:dict):return mutate(path,payload)
 return handler
for path in ['/cases','/dispatch','/advance','/discharge','/resources','/transfers','/receive']:
 app.add_api_route(path,endpoint(path),methods=['POST'],name=path[1:])
