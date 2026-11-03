import concurrent.futures,datetime,hashlib,json,os,pathlib,re,subprocess,time
root=pathlib.Path('/home/zane-fountylabs/workspace/zefun/series-of-calls');out=root/'evidence/implementation-pass-2026-11-04/final-suite';out.mkdir(exist_ok=True);logs=out/'logs';logs.mkdir(exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
inputs={str(p.relative_to(root)):sha(p) for folder in ['src','site','scripts','tests','content','spec','research','maintenance','artwork'] for p in (root/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts}
for name in ['package.json','package-lock.json','LICENSE','NOTICE','THIRD_PARTY_NOTICES.md']:inputs[name]=sha(root/name)
(out/'inputs.json').write_text(json.dumps(inputs,indent=2)+'\n')
started=datetime.datetime.now(datetime.timezone.utc).isoformat();env={**os.environ,'NODE_PATH':'/home/zane-fountylabs/workspace/fountry/node_modules'};files=sorted((root/'tests').glob('*.test.js'))
def run(p):
 path='tests/'+p.name;log=logs/(p.stem+'.tap');cmd=['node','--test','--test-isolation=none','--test-reporter=tap',path];begin=time.monotonic()
 with log.open('w') as f:
  try:code=subprocess.run(cmd,cwd=root,env=env,stdout=f,stderr=subprocess.STDOUT,timeout=180).returncode
  except subprocess.TimeoutExpired:code=124
 text=log.read_text();counts={k:int(v) for k,v in re.findall(r'^# (tests|suites|pass|fail|cancelled|skipped|todo) (\d+)$',text,re.M)}
 passed=code==0 and counts.get('tests',0)>0 and counts.get('fail')==0 and counts.get('cancelled')==0 and counts.get('skipped')==0
 return {'file':path,'fileSha256':inputs[path],'command':cmd,'exitCode':code,'status':'passed' if passed else 'failed','counts':counts,'elapsedSeconds':round(time.monotonic()-begin,3),'log':str(log.relative_to(out)),'logSha256':sha(log)}
rows=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for row in pool.map(run,files):
  rows.append(row)
  if row['status']!='passed' or len(rows)%25==0:print(json.dumps({'completed':len(rows),'file':row['file'],'status':row['status'],'counts':row['counts']}),flush=True)
changed=[p for p,h in inputs.items() if not (root/p).is_file() or sha(root/p)!=h]
report={'startedAt':started,'finishedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Complete tests/*.test.js inventory, each file in an isolated Node process with per-case TAP; dependency override, not locked release acceptance','dependencyOverride':env['NODE_PATH'],'node':subprocess.check_output(['node','--version'],text=True).strip(),'testFiles':len(files),'tests':sum(r['counts'].get('tests',0) for r in rows),'passedFiles':sum(r['status']=='passed' for r in rows),'failedFiles':sum(r['status']!='passed' for r in rows),'changedInputs':changed,'status':'diagnostic-passed' if not changed and all(r['status']=='passed' for r in rows) else 'failed','results':rows}
(out/'results.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='results'}),flush=True)
raise SystemExit(0 if report['status']=='diagnostic-passed' else 1)
