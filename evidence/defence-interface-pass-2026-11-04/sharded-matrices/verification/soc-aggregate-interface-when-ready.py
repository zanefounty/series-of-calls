import pathlib,json,time,subprocess,datetime,hashlib
root=pathlib.Path('/tmp/soc-interface-implementation')
base=pathlib.Path('/home/zane-fountylabs/workspace/zefun/series-of-calls/evidence/defence-interface-pass-2026-11-04/sharded-matrices')
out=base/'aggregates';out.mkdir(exist_ok=True)
expected={(e,j):(12 if j=='campaign' else 6) for e in ['chromium','firefox','webkit'] for j in ['campaign','compact']}
summary={'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceWorktree':str(root),'groups':[]}
finished=set()
while len(finished)<6:
 groups={k:{} for k in expected}
 for f in base.glob('*/*/browser-campaigns.json'):
  try:v=json.loads(f.read_text())
  except (OSError,json.JSONDecodeError):continue
  if v.get('status')!='shard-passed':continue
  key=(v['browser']['engine'],v['journey']);index=v['shard']['index']
  if key not in groups:continue
  if index in groups[key]:raise RuntimeError('Duplicate passing shard: '+str(key)+':'+str(index))
  groups[key][index]=f
 for key,n in expected.items():
  if key in finished or len(groups[key])!=n:continue
  files=[groups[key][i] for i in range(1,n+1)]
  receipt=out/('-'.join(key)+'.json');cmd=['node','scripts/aggregate-browser-campaigns.js','--output',str(receipt),*[str(f) for f in files]]
  r=subprocess.run(cmd,cwd=root,text=True,capture_output=True)
  item={'engine':key[0],'journey':key[1],'exitCode':r.returncode,'stdout':r.stdout,'stderr':r.stderr,'receipt':str(receipt),'sha256':hashlib.sha256(receipt.read_bytes()).hexdigest() if receipt.exists() else None}
  summary['groups'].append(item);finished.add(key);(out/'execution.json').write_text(json.dumps(summary,indent=2)+'\n');print(key,r.returncode,r.stdout,flush=True)
 state=json.loads((base/'execution-phase2.json').read_text())
 if state.get('finishedAt') and len(finished)<6:
  summary['incompleteGroups']=[{'engine':k[0],'journey':k[1],'passingShards':len(groups[k]),'requiredShards':n} for k,n in expected.items() if k not in finished];break
 if len(finished)<6:time.sleep(20)
summary['finishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();summary['status']='passed' if len(finished)==6 and all(x['exitCode']==0 for x in summary['groups']) else 'incomplete-or-failed';(out/'execution.json').write_text(json.dumps(summary,indent=2)+'\n');print(summary['status'],flush=True)
