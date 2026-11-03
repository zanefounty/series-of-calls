#!/usr/bin/env python3
"""Enumerate source obligations and narrative review without declaring semantic completion."""
from pathlib import Path
import hashlib, json, collections

ROOT = Path(__file__).resolve().parents[1]
def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode()).hexdigest()

def generate(write=True):
    source = ROOT/'research/source/series-of-calls-full-mapping.json'
    data = json.loads(source.read_text())
    requirements = {r['sources'][0]: r for r in json.loads((ROOT/'spec/generated/requirements.json').read_text())}
    narrative_path = ROOT/'content/narrative.json'
    narrative = {r['source']: r for r in json.loads(narrative_path.read_text())['entries']} if narrative_path.exists() else {}
    targets = collections.defaultdict(list)
    clauses = {}
    records = []
    for index, row in enumerate(data['rows']):
        targets[row['target_id']].append(row['id'])
        cid = 'MAP-CLAUSE-'+digest(row['implementation'])[:16]
        clauses.setdefault(cid, {'id':cid, 'obligation':row['implementation'], 'sources':[], 'semanticReview':'pending'})['sources'].append(row['id'])
        req = requirements[row['id']]
        strings = []
        def walk(value, pointer):
            if isinstance(value, dict):
                for k,v in value.items(): walk(v,pointer+'/'+k.replace('~','~0').replace('/','~1'))
            elif isinstance(value,list):
                for n,v in enumerate(value): walk(v,pointer+'/'+str(n))
            elif isinstance(value,str): strings.append({'pointer':pointer,'sha256':hashlib.sha256(value.encode()).hexdigest()})
        walk(row['original_attributes'],'/original_attributes')
        adaptation = narrative.get(row['id'])
        records.append({'id':row['id'],'sourcePointer':'/rows/'+str(index),'sourceRecordSha256':digest(row),
            'requirement':req['id'],'representation':row['target_id'],'category':row['category'],
            'treatment':row['treatment'],'clause':cid,'originalSource':row['source_file'],
            'currentSourcePathPresent':(ROOT/row['source_file']).is_file(),
            'sourcePathStatus':'research-addition' if not row['source_file'] else 'present' if (ROOT/row['source_file']).is_file() else 'historical-path-review-required',
            'historicalSource':row['source_url'],'attributeStrings':strings,
            'behaviours':req.get('behaviours',[]),'semanticReview':'pending',
            'narrative':{'status':'adapted-text' if adaptation else 'pending-review',
                         'entry':adaptation['id'] if adaptation else None}})
    files = [{'id':'FILE:'+f['path'],'sourcePointer':'/files/'+str(i),'sourceRecordSha256':digest(f),
              'requirement':requirements['FILE:'+f['path']]['id'],'path':f['path'],
              'currentPathPresent':(ROOT/f['path']).is_file(),'reviewScope':f.get('review_scope'),
              'semanticReview':'pending'} for i,f in enumerate(data['files'])]
    out={'version':1,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
         'scope':'Exhaustive structural accounting, not semantic sign-off or implementation evidence.',
         'counts':{'records':len(records),'files':len(files),'distinctClauses':len(clauses),
                   'treatments':dict(collections.Counter(r['treatment'] for r in records)),
                   'categories':dict(collections.Counter(r['category'] for r in records)),
                   'adaptedNarratives':len(narrative)},
         'sharedRepresentations':{k:v for k,v in targets.items() if len(v)>1},
         'records':records,'files':files,'clauses':list(clauses.values())}
    if write:
        path=ROOT/'spec/audit/mapping-review.json';path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps(out['counts']))
    return out

if __name__=='__main__': generate()
