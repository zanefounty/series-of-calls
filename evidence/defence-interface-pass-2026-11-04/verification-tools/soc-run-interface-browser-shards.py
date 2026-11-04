import pathlib,subprocess,json,time,datetime,concurrent.futures,threading
root=pathlib.Path('/home/zane-fountylabs/workspace/zefun/series-of-calls')
out=root/'evidence/defence-interface-pass-2026-11-04/sharded-matrices';out.mkdir(parents=True,exist_ok=True)
lock=threading.Lock();report={'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'worktree':'/tmp/soc-interface-implementation','parallelism':3,'jobs':[]}
def run(item):
 engine,journey,index,count=item;name=f'{engine}-{journey}-{index:02d}-of-{count}';start=time.monotonic()
 command=['docker','run','--rm','--pull=never','--ulimit','core=0','--ipc=private','--shm-size=1g','--mount','type=bind,src=/usr/bin/node,dst=/usr/local/bin/node,readonly','--mount','type=bind,src=/tmp/soc-interface-implementation,dst=/work','--mount',f'type=bind,src={out},dst=/evidence','--workdir','/work','--env',f'SOC_BROWSER_CAMPAIGN_EVIDENCE_DIR=/evidence/{name}','mcr.microsoft.com/playwright:v1.56.0-noble','node','scripts/browser-campaigns.js','--browser',engine,'--journey',journey,'--shard',f'{index}/{count}']
 with (out/(name+'.log')).open('w') as log:r=subprocess.run(command,stdout=log,stderr=subprocess.STDOUT)
 row={'name':name,'engine':engine,'journey':journey,'index':index,'count':count,'exitCode':r.returncode,'seconds':round(time.monotonic()-start,2),'command':command}
 with lock:
  report['jobs'].append(row);(out/'execution.json').write_text(json.dumps(report,indent=2)+'\n');print(name,r.returncode,flush=True)
 return row
jobs=[(e,'campaign',i,12) for i in range(1,13) for e in ['chromium','firefox','webkit']]+[(e,'compact',i,6) for i in range(1,7) for e in ['chromium','firefox','webkit']]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(run,jobs))
report['finishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();(out/'execution.json').write_text(json.dumps(report,indent=2)+'\n')
