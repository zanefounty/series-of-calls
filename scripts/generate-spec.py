#!/usr/bin/env python3
"""Deterministic appendices. Original source bytes and stable mapping IDs are never rewritten."""
from pathlib import Path
import hashlib, json, re

ROOT = Path(__file__).resolve().parents[1]
def read(p): return json.loads((ROOT / p).read_text())
def write(p, data):
    path = ROOT / p
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
def hid(prefix, value): return prefix + hashlib.sha256(value.encode()).hexdigest()[:16]

def generate():
    data = read('research/source/series-of-calls-full-mapping.json')
    mdpath = 'research/source/Series of Calls communications ecosystem design.md'
    md = (ROOT / mdpath).read_text()
    items, requirements, catalogue, claims = [], [], [], []
    def add(sid, location, text, kind, representation=None):
        rid = hid('REQ-', sid)
        items.append(dict(id=sid, location=location, text=text, kind=kind, requirements=[rid], disposition='specified'))
        requirements.append(dict(id=rid, sources=[sid], statement=text, representation=representation or hid('REP-',sid), status='pending', implementation=[], acceptance=[hid('AC-',sid)], reason='Requires implementation and behavioural verification; source preservation is not implementation.'))
        return rid
    for row in data['rows']:
        rid = add(row['id'], 'research/source/series-of-calls-full-mapping.json#/rows/' + str(len(catalogue)), row['implementation'], 'mapping', row['target_id'])
        catalogue.append(dict(id=row['id'], representation=row['target_id'], sourceId=row['id'], requirement=rid, category=row['category'], proposedName=row['uc_name'], role=row['uc_role'], treatment=row['treatment'], originalAttributes=row['original_attributes'], segments=row.get('segments',[]), implementationNotes=row['implementation'], status='pending', namingReview='required before gameplay use'))
    for i,f in enumerate(data['files']):
        add('FILE:'+f['path'], f'research/source/series-of-calls-full-mapping.json#/files/{i}', f['implementation'], 'file', 'FILE:'+f['path'])
    # Every nonempty paragraph, list entry and table row gets a byte-content stable source ID.
    seen={}; section='Introduction'; offset=0
    for block in re.split(r'\n\s*\n',md):
        at=md.find(block,offset);offset=at+len(block)
        if not block.strip(): continue
        if block.startswith('#'): section=block.lstrip('# ').strip()
        lines=block.splitlines() if block.startswith('|') else [block]
        for text in lines:
            if re.fullmatch(r'[| :\-]+',text):continue
            sid=hid('DESIGN-',text);seen[sid]=seen.get(sid,0)+1
            if seen[sid]>1:sid+='-'+str(seen[sid])
            line=md[:at].count('\n')+1
            rid=add(sid,mdpath+':'+str(line),text,'design')
            for label,url in re.findall(r'\[([^\]]+)\]\((https?://[^\s)]+)\)',text):
                claims.append(dict(id=hid('CLAIM-',sid+url+label),source=sid,requirement=rid,reference=hid('REF-',url),claim=text,section=section,historicalEvidence={'sourceDocument':mdpath,'assertedDate':'2026-10-29'},checkedAt=None,status='unreviewed',versionOrJurisdiction='See preserved source; requires scoped review',uncertainty='Original research assertion, not independently revalidated'))
    for d in read('research/decisions.json')['decisions']:
        add(d['id'],'research/decisions.json#'+d['id'],d['requirement'],'decision')
    for i,f in enumerate(data['review']['findings']):
        add('REVIEW:'+f['id'],f'research/source/series-of-calls-full-mapping.json#/review/findings/{i}',json.dumps(f,ensure_ascii=False),'review')
    refs={}
    for label,url in re.findall(r'\[([^\]]+)\]\((https?://[^\s)]+)\)',md):
        rid=hid('REF-',url)
        refs.setdefault(rid,dict(id=rid,url=url,labels=[],claims=[],lastSuccessfulCheck=None,acceptedReview=None,activeJurisdictionClaim=False,observations=[]))
        refs[rid]['labels'].append(label)
    for c in claims:refs[c['reference']]['claims'].append(c['id'])
    additions=read('research/additions.json')
    for extra in additions:
        rid=add(extra['id'],'research/additions.json#'+extra['id'],extra['requirement'],'additional-research')
        if extra.get('historicalEvidence'):
            items[-1]['historicalEvidence']=extra['historicalEvidence']
        ref=hid('REF-',extra['url']);cid=hid('CLAIM-',extra['id'])
        provenance=extra.get('historicalEvidence',{'sourceDocument':'research/additions.json','assertedDate':extra['checkedAt']})
        section=extra.get('section','Jurisdiction research additions')
        claims.append(dict(id=cid,source=extra['id'],requirement=rid,reference=ref,claim=extra['observation'],section=section,historicalEvidence=provenance,checkedAt=extra['checkedAt'],status='observed-pending-review',versionOrJurisdiction=extra['scope'],uncertainty=extra['uncertainty']))
        refs.setdefault(ref,dict(id=ref,url=extra['url'],labels=[extra['title']],claims=[],lastSuccessfulCheck=None,acceptedReview=None,activeJurisdictionClaim=False,observations=[]))['claims'].append(cid)
    # Upstream versions remain independent source obligations across additions,
    # renames and replacements. Register disposition is not implementation proof.
    upstream=read('maintenance/upstream/register.json')
    upstream_items=[]
    for commit in upstream['commits']:
        sid='UPSTREAM-COMMIT:'+commit['sha']
        subject=commit.get('subject') or commit['commit']['message'].splitlines()[0]
        statement='Reconcile upstream commit '+commit['sha']+': '+subject+'. Preserve applicable behaviour and verify the recorded adoption disposition.'
        rid=add(sid,'maintenance/upstream/register.json#commits/'+commit['sha'],statement,'upstream-commit')
        upstream_items.append(dict(sourceId=sid,requirement=rid,commit=commit['sha'],subject=subject,disposition=commit['disposition'],adoptionStatus=commit['status']))
    for version in upstream['fileVersions']:
        sid='UPSTREAM-FILE:'+version['path']+'@'+version['blob']
        statement='Account for upstream '+version['path']+' at Git blob '+version['blob']+'. Preserve its applicable distinct behaviour, source attribution and compatibility through adaptation; retain historical versions and acceptance evidence.'
        rid=add(sid,'maintenance/upstream/register.json#fileVersions/'+version['path']+'@'+version['blob'],statement,'upstream-file')
        upstream_items.append(dict(sourceId=sid,requirement=rid,path=version['path'],blob=version['blob'],disposition=version['disposition'],adoptionStatus=version['status']))
    write('spec/generated/upstream-obligations.json',upstream_items)
    # Tested mechanics are traceable in both directions without claiming the entire source item is done.
    behaviours=read('spec/implementation.json')['behaviours']
    for r in requirements:
        linked=[b for b in behaviours if set(r['sources'])&set(b['sources'])]
        r['behaviours']=[b['id'] for b in linked]
        if linked:
            r['implementation']=sorted({p for b in linked for p in b['implementation']})
            r['status']='partial';r['reason']='Linked mechanics have executed acceptance evidence; full source-specific fidelity and remaining capabilities still require review.'
    write('spec/generated/source-items.json',items)
    write('spec/generated/requirements.json',requirements)
    write('spec/generated/catalogue.json',catalogue)
    write('spec/generated/acceptance.json',[dict(id=r['acceptance'][0],requirement=r['id'],status=r['status'],outcome=r['statement'],testIds=sorted({t for b in behaviours if b['id'] in r['behaviours'] for t in b['testIds']})) for r in requirements])
    write('research/generated/claims.json',claims)
    write('research/generated/references.json',list(refs.values()))
    write('spec/generated/source-context.json',{k:v for k,v in data.items() if k not in ('rows','files')})
    groups={}
    for c in catalogue:groups.setdefault(c['category'],[]).append(c)
    index=['# Complete mapping appendices','', 'Generated by `python3 scripts/generate-spec.py`. Every entry is a specification obligation, not a completion claim. Original attributes, references and predicates remain in the unchanged source JSON.','']
    for category,rows in sorted(groups.items()):
        slug=re.sub('[^a-z0-9]+','-',category.lower()).strip('-')
        index.append(f'- [{category} ({len(rows)})](catalogue/{slug}.md)')
        lines=[f'# {category}','', '| Mapping ID | Proposed representation | Requirement | Behaviour obligation |','| --- | --- | --- | --- |']
        for r in rows:
            clean=lambda s:str(s).replace('|','\\|').replace('\n','<br>')
            lines.append('| '+' | '.join(map(clean,[r['id'],r['proposedName']+' / '+r['representation'],r['requirement'],r['implementationNotes']]))+' |')
        p=ROOT/f'spec/appendices/catalogue/{slug}.md';p.parent.mkdir(parents=True,exist_ok=True);p.write_text('\n'.join(lines)+'\n')
    index.append('- [Upstream commit and file-version obligations](upstream.md)')
    lines=['# Upstream source obligations','', 'Generated from the adoption register. A copied file or a classified change is not a verified implementation. Historical versions remain independently visible.','', '| Source ID | Requirement | Disposition | Adoption status |','| --- | --- | --- | --- |']
    for row in upstream_items:
        clean=lambda value:str(value).replace('|','\\|').replace('\n','<br>')
        lines.append('| '+' | '.join(clean(row[key]) for key in ['sourceId','requirement','disposition','adoptionStatus'])+' |')
    (ROOT/'spec/appendices/upstream.md').write_text('\n'.join(lines)+'\n')
    (ROOT/'spec/appendices/index.md').write_text('\n'.join(index)+'\n')
    write('spec/generated/inventory.json',dict(mappingRecords=len(data['rows']),originalRecords=sum(r['origin_group']!='new' for r in data['rows']),additions=sum(r['origin_group']=='new' for r in data['rows']),fileRecords=len(data['files']),distinctReferences=len(refs),sourceCitationOccurrences=len(re.findall(r'\[[^\]]+\]\(https?://[^\s)]+\)',md)),additionalResearchItems=len(additions),upstreamCommits=len(upstream['commits']),upstreamFileVersions=len(upstream['fileVersions']),sourceItems=len(items),requirements=len(requirements)))
    print(json.dumps(read('spec/generated/inventory.json')))
if __name__=='__main__':generate()
