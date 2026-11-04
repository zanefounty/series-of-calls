import pathlib,json,subprocess,datetime,time,hashlib,os,concurrent.futures,threading
out=pathlib.Path('/tmp/soc-interface-browser-final-v2');out.mkdir(exist_ok=True)
for name in ['interface','keyboard']:
 source=pathlib.Path('/tmp/soc-'+name+'-ui-browser.js');(out/source.name).write_bytes(source.read_bytes())
report={'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'commit':subprocess.check_output(['git','-C','/tmp/soc-interface-implementation','rev-parse','HEAD'],text=True).strip(),'imageId':json.loads(subprocess.check_output(['docker','image','inspect','mcr.microsoft.com/playwright:v1.56.0-noble']))[0]['Id'],'NODE_PATH':os.environ.get('NODE_PATH'),'parallelism':3,'scope':'Three engines, each24 bounded visible interface cases plus title keyboard help. Not full product acceptance.','drivers':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in out.glob('*.js')},'jobs':[]};lock=threading.Lock();(out/'execution.json').write_text(json.dumps(report,indent=2)+'\n')
def run(engine):
 engineout=out/engine;engineout.mkdir(exist_ok=True)
 for name in ['interface','keyboard']:
  driver=out/('soc-'+name+'-ui-browser.js');command=['docker','run','--rm','--pull=never','--ulimit','core=0','--ipc=private','--shm-size=1g','--mount','type=bind,src=/usr/bin/node,dst=/usr/local/bin/node,readonly','--mount','type=bind,src=/tmp/soc-interface-implementation,dst=/work','--mount','type=bind,src='+str(driver)+',dst=/tmp/'+driver.name+',readonly','--mount','type=bind,src='+str(engineout)+',dst=/out','--workdir','/work','--env','SOC_INTERFACE_MODE=frozen-final-policy-fix','--env','SOC_INTERFACE_LIMIT=24','--env','SOC_INTERFACE_ENGINE='+engine,'mcr.microsoft.com/playwright:v1.56.0-noble','node','/tmp/'+driver.name]
  row={'engine':engine,'driver':name,'command':command,'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()};start=time.monotonic()
  with (engineout/(name+'.log')).open('w') as log:
   try:r=subprocess.run(command,stdout=log,stderr=subprocess.STDOUT,timeout=1260 if name=='interface' else 240);row['exitCode']=r.returncode
   except subprocess.TimeoutExpired:row['exitCode']='supervisor-timeout';row['limitation']='Docker CLI timed out; inspect owned container before cleanup.'
  row.update(finishedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),seconds=round(time.monotonic()-start,2))
  with lock:report['jobs'].append(row);(out/'execution.json').write_text(json.dumps(report,indent=2)+'\n');print(engine,name,row['exitCode'],flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(run,['chromium','firefox','webkit']))
report['finishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();(out/'execution.json').write_text(json.dumps(report,indent=2)+'\n')
