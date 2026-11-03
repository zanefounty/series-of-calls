#!/usr/bin/env python3
"""Observe links/content. Never change accepted claims or gameplay."""
import concurrent.futures,datetime,hashlib,html,json,pathlib,re,urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
def main():
    refs=json.loads((ROOT/'research/generated/references.json').read_text());now=datetime.datetime.now(datetime.timezone.utc).isoformat()
    p=ROOT/'maintenance/reference-check.json';report=json.loads(p.read_text());prior={x['id']:x for x in report.get('observations',[])}
    def observe(ref):
        result={'id':ref['id'],'url':ref['url'],'observedAt':now,'acceptedReview':False}
        try:
            request=urllib.request.Request(ref['url'],headers={'User-Agent':'SeriesOfCalls-ReferenceReview/1.0'})
            with urllib.request.urlopen(request,timeout=20) as response:
                body=response.read(4_000_001)
                if len(body)>4_000_000:raise ValueError('Response exceeds observation limit')
                text=body.decode('utf-8',errors='replace');text=re.sub(r'<(script|style)[\s\S]*?</\1>',' ',text,flags=re.I);text=html.unescape(re.sub('<[^>]+>',' ',text));text=' '.join(text.split())
                digest=hashlib.sha256(text.encode()).hexdigest()
                result.update(status=response.status,finalUrl=response.url,contentHash=digest,changed=prior.get(ref['id'],{}).get('contentHash') not in [None,digest])
        except Exception as error:result.update(status='unavailable',error=str(error))
        return result
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:observations=list(pool.map(observe,refs))
    history=ROOT/'maintenance/reference-history'/(now.replace(':','-')+'.json');history.parent.mkdir(parents=True,exist_ok=True);history.write_text(json.dumps(observations,indent=2)+'\n')
    complete=all(isinstance(x['status'],int) and 200<=x['status']<400 for x in observations)
    report.update(lastAttempt=now,observations=observations)
    if complete:report['lastSuccessfulCheck']=now
    p.write_text(json.dumps(report,indent=2)+'\n');print(f'Observed {len(observations)} references; complete={complete}; changed={sum(x.get("changed",False) for x in observations)}')
    if not complete:raise SystemExit(1)
if __name__=='__main__':main()
