import unittest,tempfile,os
from pathlib import Path
from unittest.mock import patch
import cv2,numpy as np
from app.models.face import analyze_face,face_analyzer
class FaceVideoTests(unittest.TestCase):
 def setUp(self):
  f=tempfile.NamedTemporaryFile(suffix='.avi',delete=False);f.close();self.path=f.name
  writer=cv2.VideoWriter(self.path,cv2.VideoWriter_fourcc(*'MJPG'),6,(64,64))
  if not writer.isOpened():self.skipTest('MJPG fixture codec unavailable')
  for _ in range(6):writer.write(np.zeros((64,64,3),dtype=np.uint8))
  writer.release();self.media=Path(self.path).read_bytes()
 def tearDown(self):
  if os.path.exists(self.path):os.remove(self.path)
 def test_video_aggregates_detected_frames(self):
  detected={'detected':True,'signal_quality':'good','emotion':'Neutral','risk_score':10,'model_used':'trained_face_cnn','fatigue_available':False}
  with patch.object(face_analyzer,'analyze_frame',side_effect=[{'error':'Invalid image data'}]+[detected]*6):result=analyze_face(self.media)
  self.assertTrue(result['detected']);self.assertEqual(result['frames_used'],6);self.assertFalse(result['fatigue_available']);self.assertNotIn('fatigue_level',result)
 def test_no_face_does_not_fabricate_detection(self):
  with patch.object(face_analyzer,'analyze_frame',side_effect=[{'error':'Invalid image data'}]+[{'detected':False,'signal_quality':'no_face'}]*6):result=analyze_face(self.media)
  self.assertFalse(result['detected']);self.assertEqual(result['signal_quality'],'no_face');self.assertNotIn('risk_score',result)
if __name__=='__main__':unittest.main()
