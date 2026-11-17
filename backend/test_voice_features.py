"""Parity against training-time librosa; install original development requirements."""
import unittest
import numpy as np
import librosa
from app.models.voice import extract_features, model
class VoiceParity(unittest.TestCase):
    def test_features_and_classifier_match(self):
        for sr in [16000,22050,44100]:
            y=np.random.default_rng(123).normal(0,.1,sr).astype('float32')
            actual=extract_features(y,sr)
            reference=librosa.feature.mfcc(y=y,sr=sr,n_mfcc=40).mean(axis=1)
            with self.subTest(sample_rate=sr):
                np.testing.assert_allclose(actual,reference,atol=.002,rtol=.002)
                np.testing.assert_allclose(model.predict_proba(actual.reshape(1,-1)),model.predict_proba(reference.reshape(1,-1)))
if __name__=='__main__':unittest.main()
