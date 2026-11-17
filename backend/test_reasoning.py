import json,unittest
from types import SimpleNamespace
from unittest.mock import Mock
from app.models.reasoning import MedicalReasoningAgent,SummaryUnavailable
class SummaryTests(unittest.TestCase):
 def agent(self,content=None):
  agent=object.__new__(MedicalReasoningAgent);agent.model_name='test-model'
  agent.client=SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=Mock(return_value=SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])))))
  return agent
 def test_generated_provenance(self):
  note={k:'Recorded for staff review' for k in ['subjective','objective','assessment','plan','reasoning']};note['alert_level']='Watch'
  x=self.agent(json.dumps(note)).generate_soap_note({}, {}, {}, {})
  self.assertEqual(x['status'],'generated');self.assertEqual(x['provider'],'nvidia');self.assertEqual(x['model'],'test-model')
 def test_no_key_never_fakes_note(self):
  agent=self.agent();agent.client=None
  with self.assertRaises(SummaryUnavailable) as raised:agent.generate_soap_note({}, {}, {}, {})
  self.assertEqual(raised.exception.code,'not_configured')
 def test_invalid_json_never_falls_back(self):
  with self.assertRaises(SummaryUnavailable):self.agent('invalid').generate_soap_note({}, {}, {}, {})
 def test_incomplete_note_never_falls_back(self):
  with self.assertRaises(SummaryUnavailable):self.agent('{}').generate_soap_note({}, {}, {}, {})
if __name__=='__main__':unittest.main()
