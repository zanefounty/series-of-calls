import pathlib,subprocess,json,hashlib,datetime,os,time
root=pathlib.Path('/tmp/soc-managed-leaver-implementation');out=root/'evidence/managed-leaver-pass-2026-11-04/integrated-checks';out.mkdir(parents=True,exist_ok=True)
plan=json.loads((root/'spec/acceptance-plan.json').read_text());inputs=sorted(set(plan['inputs']+['spec/acceptance-plan.json','spec/implementation.json']))
def hashes():return {p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in inputs}
env=dict(os.environ);env.pop('NODE_PATH',None);env['TEST_JOBS']='4'
report={'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'nodePathOverride':None,'inputsBefore':hashes(),'checks':[]}
commands=[('full-suite',['npm','test']),('acceptance',['npm','run','evidence']),('gates-mutations',['npm','run','test:gates']),('development',['npm','run','check:all']),('delivery',['npm','run','check:delivery']),('translations',['npm','run','i18n:check']),('build',['npm','run','build']),('release',['npm','run','check:release'])]
for name,cmd in commands:
 start=time.monotonic()
 with (out/(name+'.log')).open('w') as log:r=subprocess.run(cmd,cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
 report['checks'].append({'name':name,'command':cmd,'exitCode':r.returncode,'seconds':round(time.monotonic()-start,2),'log':name+'.log'})
 print(name,r.returncode,flush=True)
 (out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
report['inputsAfter']=hashes();report['inputDrift']=[p for p in inputs if report['inputsBefore'][p]!=report['inputsAfter'][p]];report['finishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();(out/'results.json').write_text(json.dumps(report,indent=2)+'\n');print('drift',report['inputDrift'],flush=True)
