"""Live NVIDIA coordination summaries. Provider failures never generate fake notes."""
import json,os
from datetime import datetime,timezone
from dotenv import load_dotenv
from openai import OpenAI,APIStatusError,APITimeoutError,APIConnectionError
load_dotenv()

class SummaryUnavailable(RuntimeError):
    def __init__(self,code,message):
        super().__init__(message);self.code=code

class MedicalReasoningAgent:
    def __init__(self):
        self.model_name=os.getenv('NVIDIA_MODEL','nvidia/nemotron-3.5-bolt-e4b')
        key=os.getenv('NVIDIA_API_KEY','').strip()
        self.client=OpenAI(base_url='https://integrate.api.nvidia.com/v1',api_key=key,timeout=40.,max_retries=0) if key else None

    def generate_soap_note(self,patient_data,vitals_analysis,face_analysis,voice_analysis,transcript=None):
        if self.client is None:raise SummaryUnavailable('not_configured','NVIDIA_API_KEY is not configured on the backend.')
        context={'timestamp':datetime.now(timezone.utc).isoformat(),'vitals':patient_data.get('vitals',{}),'vitals_model':vitals_analysis,'face_model':face_analysis,'voice_model':voice_analysis,'allocation_fusion':patient_data.get('allocation',{}),'transcript':transcript or 'No transcript recorded; voice score is acoustic, not speech transcription.'}
        prompt="""You summarize experimental healthcare coordination signals for authorised staff.
Do not diagnose, prescribe, recommend treatment or infer medical conditions from emotions.
Do not invent patient statements or measurements. If fatigue_available is false, eye fatigue was NOT measured; report only the observed emotion/CNN score. Missing/excluded signals must be disclosed. Model scores are experimental, not validated clinical probabilities.
Return ONLY a JSON object with these six required keys: subjective, objective, assessment, plan, alert_level, reasoning.
Every value must be a short nonempty STRING, not an object/list. alert_level must be Critical, Watch, or Stable; it describes experimental review priority, not a clinical assessment. Base discussion on allocation_fusion risk_score and available signals. plan must request human review/confirmation of resources, never treatment. Keep the entire response under 220 words."""
        try:
            completion=self.client.chat.completions.create(model=self.model_name,messages=[{'role':'system','content':prompt},{'role':'user','content':json.dumps(context)}],temperature=.1,max_tokens=700,response_format={'type':'json_object'})
            note=json.loads(completion.choices[0].message.content or '')
            if not isinstance(note,dict):raise ValueError('Expected JSON object')
            required=['subjective','objective','assessment','plan','alert_level','reasoning']
            for field in required:
                value=note.get(field)
                if isinstance(value,(dict,list)):value=json.dumps(value,ensure_ascii=False)
                if not isinstance(value,str) or not value.strip():raise ValueError('Missing '+field)
                note[field]=value.strip()[:5000]
            if note['alert_level'] not in ['Critical','Watch','Stable']:raise ValueError('Invalid alert level')
            result={field:note[field] for field in required}
            result.update(status='generated',provider='nvidia',model=self.model_name,generated_at=datetime.now(timezone.utc).isoformat())
            return result
        except APIStatusError as exc:
            status=exc.status_code
            if status in [401,403]:message='NVIDIA rejected the configured API key or its model access.'
            elif status in [404,410]:message='The configured NVIDIA model is unavailable or retired; update NVIDIA_MODEL.'
            elif status==429:message='NVIDIA rate limit or quota reached; retry later.'
            else:message='NVIDIA generation service returned an error.'
            raise SummaryUnavailable('provider_http_'+str(status),message) from exc
        except APITimeoutError as exc:raise SummaryUnavailable('provider_timeout','NVIDIA generation timed out; retry the summary.') from exc
        except APIConnectionError as exc:raise SummaryUnavailable('provider_connection','Could not connect securely to NVIDIA; retry later.') from exc
        except (ValueError,IndexError,TypeError,AttributeError) as exc:raise SummaryUnavailable('invalid_response','NVIDIA did not return a complete structured summary; retry.') from exc

reasoning_agent=MedicalReasoningAgent()
