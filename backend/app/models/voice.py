"""Trained voice inference with librosa-compatible MFCCs and bounded audio decoding.
Avoids librosa/Numba pitch compilation in the serving process; pitch is not a
feature of the saved classifier. Training scripts may continue using librosa.
"""
import os,tempfile,subprocess
from functools import lru_cache
import numpy as np
import soundfile as sf
from scipy.fft import dct
from scipy.signal import get_window
import joblib
BASE_DIR=os.path.dirname(os.path.abspath(__file__))
try:
    model=joblib.load(os.path.join(BASE_DIR,'voice_model.pkl'))
    print('Trained voice model loaded')
except Exception as exc:
    print('Voice model unavailable:',exc);model=None

@lru_cache(maxsize=8)
def mel_filters(sr):
    # Slaney scale, 128 mel bands, area normalization; librosa defaults.
    hz=np.array([0.,sr/2.])
    mel=hz/(200./3.)
    log=hz>=1000
    mel[log]=15+np.log(hz[log]/1000)/(np.log(6.4)/27)
    grid=np.linspace(mel[0],mel[1],130)
    bands=grid*(200./3.);log=grid>=15
    bands[log]=1000*np.exp((grid[log]-15)*(np.log(6.4)/27))
    fft=np.fft.rfftfreq(2048,1./sr)
    ramps=bands[:,None]-fft[None,:];diff=np.diff(bands)
    weights=np.zeros((128,1025),dtype=np.float32)
    for i in range(128):weights[i]=np.maximum(0,np.minimum(-ramps[i]/diff[i],ramps[i+2]/diff[i+1]))
    weights*= (2./(bands[2:]-bands[:-2]))[:,None]
    return weights

def extract_features(y,sr):
    padded=np.pad(np.asarray(y,dtype=np.float32),(1024,1024),mode='constant')
    frames=np.lib.stride_tricks.sliding_window_view(padded,2048)[::512]
    window=get_window('hann',2048,fftbins=True)
    spectrum=np.fft.rfft(frames*window,axis=1).astype(np.complex64)
    power=(np.abs(spectrum)**2).T
    mel=mel_filters(int(sr))@power
    db=10*np.log10(np.maximum(1e-10,mel));db=np.maximum(db,db.max()-80.)
    return dct(db,type=2,axis=0,norm='ortho')[:40].mean(axis=1)

def analyze_voice(audio_bytes):
    source=target=None
    try:
        if model is None:return {'error':'Trained voice model unavailable','model_used':'unavailable'}
        with tempfile.NamedTemporaryFile(suffix='.media',delete=False) as f:
            f.write(audio_bytes);source=f.name
        with tempfile.NamedTemporaryFile(suffix='.wav',delete=False) as f:target=f.name
        subprocess.run(['ffmpeg','-nostdin','-y','-i',source,'-t','10','-ac','1',target],check=True,capture_output=True,timeout=25)
        y,sr=sf.read(target,dtype='float32',always_2d=True);y=y.mean(axis=1)
        if not len(y) or float(np.sqrt(np.mean(y*y)))<.008:
            return {'no_speech':True,'model_used':'trained_voice','signal_quality':'silent'}
        features=extract_features(y,sr).reshape(1,-1)
        probs=model.predict_proba(features)[0]
        weights={0:0.,1:50.,2:100.}
        score=sum(float(p)*weights.get(int(c),0.) for c,p in zip(model.classes_,probs))
        return {'model_used':'trained_voice','stress_score':round(score,1),'risk_class':int(model.predict(features)[0]),'probabilities':{ {0:'low',1:'medium',2:'high'}.get(int(c),str(c)):float(p) for c,p in zip(model.classes_,probs)},'no_speech':False,'signal_quality':'audible','duration_seconds':round(len(y)/sr,2)}
    except Exception as exc:
        print('Voice analysis failed:',type(exc).__name__)
        return {'error':'Voice sample could not be analysed','model_used':'unavailable'}
    finally:
        for path in [source,target]:
            if path and os.path.exists(path):os.remove(path)
