import pathlib,subprocess,json,time,datetime,concurrent.futures,threading,hashlib,os,signal
root=pathlib.Path('/home/zane-fountylabs/workspace/zefun/series-of-calls')
out=root/'evidence/defence-interface-pass-2026-11-04/sharded-matrices';out.mkdir(parents=True,exist_ok=True)
lock=threading.Lock();report={'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'worktree':'/tmp/soc-interface-implementation','parallelism':6,'jobs':[]}
def run(item):
 engine,journey,index,count=item;name=f'{engine}-{journey}-{index:02d}-of-{count}-phase2';start=time.monotonic()
 command=['docker','run','--rm','--pull=never','--ulimit','core=0','--ipc=private','--shm-size=1g','--mount','type=bind,src=/usr/bin/node,dst=/usr/local/bin/node,readonly','--mount','type=bind,src=/tmp/soc-interface-implementation,dst=/work','--mount',f'type=bind,src={out},dst=/evidence','--workdir','/work','--env',f'SOC_BROWSER_CAMPAIGN_EVIDENCE_DIR=/evidence/{name}','mcr.microsoft.com/playwright:v1.56.0-noble','node','scripts/browser-campaigns.js','--browser',engine,'--journey',journey,'--shard',f'{index}/{count}']
 with (out/(name+'.log')).open('w') as log:r=subprocess.run(command,stdout=log,stderr=subprocess.STDOUT)
 row={'name':name,'engine':engine,'journey':journey,'index':index,'count':count,'exitCode':r.returncode,'seconds':round(time.monotonic()-start,2),'command':command}
 with lock:
  report['jobs'].append(row);(out/'execution-phase2.json').write_text(json.dumps(report,indent=2)+'\n');print(name,r.returncode,flush=True)
 return row
jobs=[(e,'campaign',i,12) for i in range(1,13) for e in ['chromium','firefox','webkit']]+[(e,'compact',i,6) for i in range(1,7) for e in ['chromium','firefox','webkit']]
def completed():
 found={}
 for p in out.rglob('browser-campaigns.json'):
  d=json.loads(p.read_text());sh=d.get('shard') or {}
  if d.get('status')!='shard-passed' or d.get('errors') or d.get('sourceDrift') or len(d.get('results',[]))!=len(d.get('plannedCaseKeys',[])) or not all(r.get('status')=='passed' for r in d.get('results',[])):continue
  if not all(hashlib.sha256((pathlib.Path('/tmp/soc-interface-implementation')/f).read_bytes()).hexdigest()==h for f,h in d['inputs'].items()):continue
  key=(d['browser']['engine'],d['journey'],sh['index'],sh['count']);found[key]=str(p)
 return found
initial={(e,'campaign',1,12) for e in ['chromium','firefox','webkit']}
while not initial.issubset(completed()):time.sleep(5)
processes=[]
for p in pathlib.Path('/proc').iterdir():
 if p.name.isdigit():
  try:
   args=(p/'cmdline').read_bytes().split(b'\0')
   if len(args)>1 and args[1]==b'/tmp/soc-run-interface-browser-shards.py':processes.append(int(p.name))
  except OSError:pass
assert len(processes)==1,processes
pid=processes[0];os.kill(pid,signal.SIGSTOP)
children=[]
def descendants(n):
 try:kids=[int(x) for x in pathlib.Path(f'/proc/{n}/task/{n}/children').read_text().split()]
 except OSError:kids=[]
 for kid in kids:descendants(kid);children.append(kid)
descendants(pid)
for kid in children:
 try:os.kill(kid,signal.SIGTERM)
 except ProcessLookupError:pass
# Stop only baseline matrix containers for this worktree; feature/other-user containers are excluded.
interrupted=[]
ids=subprocess.check_output(['docker','ps','-q'],text=True).split()
for cid in ids:
 d=json.loads(subprocess.check_output(['docker','inspect',cid],text=True))[0]
 if 'scripts/browser-campaigns.js' in (d['Config'].get('Cmd') or []) and any(m.get('Source')=='/tmp/soc-interface-implementation' for m in d['Mounts']):
  interrupted.append({'id':cid,'command':d['Config']['Cmd']});subprocess.run(['docker','stop','--timeout','5',cid],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
os.kill(pid,signal.SIGTERM);os.kill(pid,signal.SIGCONT)
retained=completed()
(out/'phase1-interruption.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'reason':'After initial shards completed, increase orchestration concurrency from three to six without changing cases, inputs or deadlines. Preserve incomplete attempts; rerun only shards lacking verified completed receipts.','process':pid,'interruptedContainers':interrupted,'retainedReceipts':list(retained.values())},indent=2)+'\n')
report['retainedCompleted']=[{'key':list(k),'report':p,'sha256':hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()} for k,p in sorted(retained.items())]
jobs=[j for j in jobs if j not in retained];report['remainingJobs']=len(jobs);report['startedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();print('Phase2 starting',len(jobs),'remaining jobs',flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:list(pool.map(run,jobs))
report['finishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();(out/'execution-phase2.json').write_text(json.dumps(report,indent=2)+'\n')
