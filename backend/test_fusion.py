import unittest
from app.models.fusion import fusion_details
class Fusion(unittest.TestCase):
 def test_missing_not_zero(self):
  x=fusion_details({'vitals_risk':{'risk_score':60}});self.assertEqual(x['risk_score'],60);self.assertEqual(len(x['signals']),1)
 def test_all_three(self):
  x=fusion_details({'vitals_risk':{'risk_score':60},'face_fatigue_index':{'detected':True,'risk_score':80,'signal_quality':'good','model_used':'trained_face_cnn'},'voice_stress_score':{'stress_score':40,'no_speech':False,'model_used':'trained_voice'}});self.assertEqual(x['risk_score'],60);self.assertEqual(len(x['signals']),3)
 def test_unusable_excluded(self):
  x=fusion_details({'vitals_risk':{'risk_score':50},'face_fatigue_index':{'detected':False,'risk_score':0},'voice_stress_score':{'stress_score':0,'no_speech':True}});self.assertEqual(x['risk_score'],50);self.assertEqual(set(x['excluded']),{'face','voice'})
 def test_no_usable_signals(self):
  with self.assertRaises(ValueError):fusion_details({})
if __name__=='__main__':unittest.main()
