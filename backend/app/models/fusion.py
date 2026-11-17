"""Experimental advisory fusion; missing modalities never count as zero-risk evidence."""
import math

def fusion_details(results):
    definitions=[('vitals','vitals_risk','risk_score',.6),('face','face_fatigue_index','risk_score',.2),('voice','voice_stress_score','stress_score',.2)]
    used=[];excluded={}
    for name,key,score,weight in definitions:
        block=results.get(key) or {}
        valid=bool(block) and not block.get('error')
        if name=='face':valid=valid and block.get('detected') is True and block.get('signal_quality','good')=='good' and block.get('model_used')!='unavailable'
        if name=='voice':valid=valid and block.get('no_speech') is False and block.get('model_used')=='trained_voice'
        value=block.get(score)
        if not valid or not isinstance(value,(int,float)) or not math.isfinite(value):
            excluded[name]=block.get('error') or block.get('signal_quality') or ('no_speech' if block.get('no_speech') else 'not supplied or unavailable');continue
        used.append(dict(modality=name,score=max(0,min(100,float(value))),weight=weight))
    if not used:raise ValueError('No usable model signals')
    total=sum(x['weight'] for x in used)
    score=sum(x['score']*x['weight'] for x in used)/total
    if any(x['score']>90 for x in used):score=max(score,85)
    return dict(risk_score=round(score,1),signals=[dict(x,normalized_weight=round(x['weight']/total,4)) for x in used],excluded=excluded,model_used='multimodal_fusion',advisory=True)

def calculate_risk(results):return fusion_details(results)['risk_score']
