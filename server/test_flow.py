import unittest,copy
from main import conn,action,recommend
class Flow(unittest.TestCase):
 def setUp(self):
  import json
  with conn() as c:self.s=json.loads(c.execute('SELECT data FROM state').fetchone()[0])
 def test_dispatch_release(self):
  q=action(self.s,'/cases',dict(name='Test',location='Gate',requestId='repeat',needs={'icu':1,'ventilators':1},urgency='critical'))
  self.assertEqual(action(self.s,'/cases',{'requestId':'repeat'})['id'],q['id'])
  self.assertFalse(next(r for r in recommend(self.s,q) if r['hospitalId']=='h3')['eligible'])
  h=self.s['hospitals'][0];before=h['icu'];action(self.s,'/dispatch',dict(caseId=q['id'],hospitalId='h1'));self.assertEqual(h['icu'],before-1)
  with self.assertRaises(ValueError):action(self.s,'/dispatch',dict(caseId=q['id'],hospitalId='h1'))
  for _ in range(4):action(self.s,'/advance',dict(caseId=q['id']))
  self.assertEqual(q['status'],'arrived');action(self.s,'/discharge',dict(caseId=q['id']));self.assertEqual(h['icu'],before)
 def test_supply_transfer(self):
  source,target=self.s['hospitals'][:2];total=source['oxygen']+target['oxygen'];t=action(self.s,'/transfers',dict(source='h1',target='h2',item='oxygen',amount=3));self.assertEqual(source['oxygen']+target['oxygen'],total-3);action(self.s,'/receive',dict(id=t['id']));self.assertEqual(source['oxygen']+target['oxygen'],total)
  with self.assertRaises(ValueError):action(self.s,'/receive',dict(id=t['id']))
 def test_patient_transfer(self):
  q=action(self.s,'/cases',dict(name='Test',location='Gate',needs={'icu':1}));action(self.s,'/dispatch',dict(caseId=q['id'],hospitalId='h1'))
  for _ in range(4):action(self.s,'/advance',dict(caseId=q['id']))
  t=action(self.s,'/transfers',dict(kind='patient',source='h1',target='h2',caseId=q['id'],amount=1));self.assertEqual(q['hospitalId'],'h2')
  with self.assertRaises(ValueError):action(self.s,'/receive',dict(id=t['id']))
  for _ in range(4):action(self.s,'/advance',dict(caseId=q['id']))
  action(self.s,'/receive',dict(id=t['id']));self.assertEqual(t['status'],'received')
if __name__=='__main__':unittest.main()
