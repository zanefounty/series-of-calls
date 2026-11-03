#!/usr/bin/env python3
"""Validate observation-only artifacts before a trusted job proposes a persistence PR.

Never accepts source claims, dispositions, exclusions, budgets or gameplay changes.
"""
import argparse,datetime,json,pathlib,re
ROOT=pathlib.Path(__file__).resolve().parents[1]
def need(value,message):
 if not value:raise ValueError(message)
def load(p):return json.loads(p.read_text())
def validate(root,artifact,kind):
 prefix='maintenance/upstream' if kind=='upstream' else 'maintenance'
 files={};size=0
 for p in artifact.rglob('*'):
  need(not p.is_symlink(),'Artifact symlink is forbidden')
  if not p.is_file():continue
  rel=p.relative_to(artifact).as_posix();size+=p.stat().st_size
  need(size<=100_000_000,'Observation artifact too large')
  allowed=(re.fullmatch(r'(register|commits|tree|comparison|releases)\.json',rel) or re.fullmatch(r'history/[A-Za-z0-9_.:-]+\.json',rel)) if kind=='upstream' else (rel=='reference-check.json' or re.fullmatch(r'reference-history/[A-Za-z0-9_.:-]+\.json',rel))
  need(allowed,'Unsupported observation path: '+rel)
  files[prefix+'/'+rel]=p
  if '/history/' in prefix+'/'+rel or rel.startswith('reference-history/'):
   existing=root/prefix/rel
   need(not existing.exists() or existing.read_bytes()==p.read_bytes(),'Historical observation changed')
  load(p)
 def observed(name):
  need(prefix+'/'+name in files,'Missing observation: '+name)
  return load(files[prefix+'/'+name])
 def timestamp(value):
  now=datetime.datetime.now(datetime.timezone.utc);date=datetime.datetime.fromisoformat(value.replace('Z','+00:00'))
  need(date.tzinfo is not None and datetime.timedelta(0)<=now-date<=datetime.timedelta(days=2),'Observation is stale or from the future')
 if kind=='upstream':
  old=load(root/prefix/'register.json');new=observed('register.json')
  timestamp(new['lastSuccessfulCheck']);need(new['latestReleaseCheck']==new['lastSuccessfulCheck'],'Incomplete release observation')
  mutable={'commits','files','fileVersions','changes','observations','latestObserved','lastSuccessfulCheck','latestReleaseCheck','fullHistoryAvailable','latestRelease'}
  need(set(new)==set(old)|{'observations'},'Register fields changed')
  need(all(new[k]==old[k] for k in old if k not in mutable),'Observation changed register governance')
  for key,identity in [('commits',lambda x:x['sha']),('files',lambda x:x['path']),('fileVersions',lambda x:(x['path'],x['blob']))]:
   before={identity(x):x for x in old[key]};after={identity(x):x for x in new[key]}
   need(len(after)==len(new[key]) and before.keys()<=after.keys(),'Historical accounting removed or duplicated')
   for ident,item in before.items():need(after[ident]==item,'Observation changed an existing disposition')
   for ident in after.keys()-before.keys():
    item=after[ident];need(item.get('disposition') is None and item.get('classifiedAt') is None and item.get('status')=='pending' and item.get('urgent') is False and item.get('evidence')==[],'New change must await classification')
    need(not any(k in item for k in ['approvedBy','approvalUrl','rationale']),'Observation cannot approve exclusions')
    need(item.get('detectedAt')==new['lastSuccessfulCheck'],'Incorrect detection date')
  need(new['observations'][:len(old.get('observations',[]))]==old.get('observations',[]) and len(new['observations'])==len(old.get('observations',[]))+1,'Observation history must append exactly once')
  historical=new['observations'][-1];need(historical in files,'Latest observation artifact absent');history=load(files[historical])
  need(history['observedAt']==new['lastSuccessfulCheck'] and history['head']==new['latestObserved'],'Observation pointers differ')
  tree=observed('tree.json');need(tree['sha']==history['head'] and tree['tree']==history['files'] and tree['truncated'] is False,'Tree inventory differs')
  need(observed('commits.json')==history['commits'] and observed('releases.json')==history['releases'],'Commit/release inventory differs')
  stable=sorted((r for r in history['releases'] if not r['prerelease']),key=lambda r:r['publishedAt'] or '',reverse=True)
  if stable:need(new['latestRelease']['tag']==stable[0]['tag'] and new['latestRelease']['commit']==stable[0]['sha'],'Latest release pointer differs')
  comparison=observed('comparison.json');need(comparison['files']==history['changes'] and comparison['total_commits']==len(history['commits']),'Comparison differs')
 else:
  report=observed('reference-check.json');timestamp(report['lastAttempt'])
  refs={r['id']:r['url'] for r in load(root/'research/generated/references.json')};rows=report['observations']
  need(len(rows)==len(refs) and {r['id'] for r in rows}==set(refs),'Incomplete reference inventory')
  for row in rows:
   need(row['url']==refs[row['id']] and row['acceptedReview'] is False and row['observedAt']==report['lastAttempt'],'Observation cannot accept or redirect a registered claim')
   if isinstance(row['status'],int):need(re.fullmatch('[0-9a-f]{64}',row['contentHash']),'Invalid content digest')
   else:need(row['status']=='unavailable' and row.get('error'),'Unexplained observation failure')
  successful=all(isinstance(r['status'],int) and 200<=r['status']<400 for r in rows)
  old=load(root/'maintenance/reference-check.json')
  need(report.get('lastSuccessfulCheck')==(report['lastAttempt'] if successful else old.get('lastSuccessfulCheck')),'Failed checks cannot advance the successful-check clock')
  historical=[load(p) for name,p in files.items() if '/reference-history/' in name and not (root/name).exists()]
  need(len(historical)==1 and historical[0]==rows,'Missing or mismatched reference history')
 return files
def main():
 parser=argparse.ArgumentParser();parser.add_argument('kind',choices=['upstream','references']);parser.add_argument('artifact',type=pathlib.Path);args=parser.parse_args()
 files=validate(ROOT,args.artifact,args.kind)
 for name,p in files.items():
  target=ROOT/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(p.read_bytes())
 print(f'Validated {len(files)} observation files; reviewer acceptance remains unchanged')
if __name__=='__main__':main()
