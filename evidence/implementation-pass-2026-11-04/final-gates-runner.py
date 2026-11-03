import datetime,hashlib,json,os,pathlib,subprocess,re
root=pathlib.Path('/home/zane-fountylabs/workspace/zefun/series-of-calls');out=root/'evidence/implementation-pass-2026-11-04';env={**os.environ,'NODE_PATH':'/home/zane-fountylabs/workspace/fountry/node_modules'}
plan=json.loads((root/'spec/acceptance-plan.json').read_text());paths=set(plan['inputs']+['spec/acceptance-plan.json','tests/gates_test.py'])
def sha(p):return hashlib.sha256((root/p).read_bytes()).hexdigest()
inputs={p:sha(p) for p in sorted(paths)};rows=[]
steps=[('acceptance',['python3','scripts/record-evidence.py']),('accounting-gates',['python3','scripts/verify.py','all']),('gate-mutations',['python3','-m','unittest','discover','-s','tests','-p','*_test.py']),('delivery-index',['python3','scripts/delivery-inventory.py','--check']),('translations',['node','scripts/i18n-check.js']),('build',['node','scripts/build.js'])]
started=datetime.datetime.now(datetime.timezone.utc).isoformat()
for name,cmd in steps:
 log=out/('final-'+name+'.log')
 with log.open('w') as f:
  try:code=subprocess.run(cmd,cwd=root,env=env,stdout=f,stderr=subprocess.STDOUT,timeout=600).returncode
  except subprocess.TimeoutExpired:code=124
 row={'step':name,'command':cmd,'exitCode':code,'status':'passed' if code==0 else 'failed','log':log.name,'logSha256':hashlib.sha256(log.read_bytes()).hexdigest()};rows.append(row);print(name+': '+row['status'],flush=True)
release=subprocess.run(['python3','scripts/verify.py','release'],cwd=root,env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
changed=[p for p,h in inputs.items() if not (root/p).exists() or sha(p)!=h]
a=json.loads((root/'evidence/acceptance.json').read_text());report={'startedAt':started,'finishedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Fresh acceptance and development gates after regenerated mapping audit and complete negative-test artwork fixture; full JavaScript inventory and earlier foundation results remain separate','dependencyOverride':env['NODE_PATH'],'results':rows,'acceptanceCases':len(a['tests']),'acceptanceFailures':a['failures'],'inputHashes':inputs,'changedInputs':changed,'release':{'status':'eligible' if release.returncode==0 else 'blocked','exitCode':release.returncode,'output':release.stdout.strip()},'status':'passed' if not changed and all(x['exitCode']==0 for x in rows) else 'failed'}
(out/'final-checks.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k not in ['inputHashes','results']}),flush=True);raise SystemExit(0 if report['status']=='passed' else 1)
