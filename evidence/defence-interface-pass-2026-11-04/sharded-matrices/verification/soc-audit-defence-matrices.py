import json,hashlib,itertools,subprocess,datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
ROOT=Path('/home/zane-fountylabs/workspace/zefun/series-of-calls')
BASE=ROOT/'evidence/defence-interface-pass-2026-11-04/sharded-matrices'
OLD=Path('/tmp/soc-interface-implementation')
OUT=Path('/tmp/soc-defence-matrix-independent-audit.json')
def sha(p):
 h=hashlib.sha256()
 with Path(p).open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def canonical(v):return json.dumps(v,ensure_ascii=False,separators=(',',':'))
def objsha(v):return hashlib.sha256(canonical(v).encode()).hexdigest()
def need(v,msg):
 if not v:raise AssertionError(msg)
def read(p):return json.loads(Path(p).read_text())
fresh=read('/tmp/soc-defence-matrix-fresh-inputs.json'); inputs=fresh['inputs']; allcases=fresh['cases']; keys=[c['key'] for c in allcases]
need(fresh['head']=='03bd1ecef81f30a66826f1c69564ad30433deda2','wrong historical HEAD')
profiles=list(itertools.product(['smb','enterprise','government','defence'],['AU','US','JP','EU'],['guided','assessed','sandbox']))
need({(c['profile']['scenario'],c['profile']['jurisdiction'],c['profile']['mode']) for c in allcases}==set(profiles),'actual profile matrix')
need(len(keys)==len(set(keys))==144,'actual case matrix')
versions={'chromium':'141.0.7390.37','firefox':'142.0.1','webkit':'26.0'}
result={'status':'running','scope':'Historical defence-interface frozen runtime only; not current WFM/managed-leaver acceptance or complete-product/release acceptance.','startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':{'directory':str(OLD),'head':fresh['head'],'inputCount':len(inputs),'inputSha256':objsha(inputs),'lockfileSha256':inputs['package-lock.json'],'freshBuildSha256':fresh['buildSha256'],'freshBuildFiles':len(fresh['buildFiles']),'node':fresh['node'],'playwright':fresh['playwright'],'jsdom':fresh['jsdom']},'aggregates':[],'artifacts':[],'preservedIncompleteAttempts':[],'errors':[]}
try:
 receiptpaths=set(); artifactjobs=[]
 for engine,journey in itertools.product(versions,['compact','campaign']):
  ap=BASE/'aggregates'/f'{engine}-{journey}.json'; a=read(ap); count=6 if journey=='compact' else 12
  need(a['status']=='passed' and a['caseCount']==144 and a['shards']==count,'aggregate status/count')
  need(a['inputs']==inputs and a['inputSha256']==objsha(inputs),'historical aggregate inputs')
  need(a['artifactSha256']==fresh['buildSha256'] and a['lockfileSha256']==inputs['package-lock.json'],'aggregate build/lock')
  need(a['browser']=={'engine':engine,'version':versions[engine],'playwright':'1.56.0','playwrightLockfile':'1.56.0'},'browser pin')
  need(a['sourceDrift']==[] and len(a['results'])==144 and [c['key'] for c in a['results']]==keys,'aggregate exact case union')
  need(len(a['profileMatrix'])==48 and {(p['scenario'],p['jurisdiction'],p['mode']) for p in a['profileMatrix']}==set(profiles),'aggregate profiles')
  rows={}; shardindexes=set(); receiptproof=[]
  for sr in a['shardReceipts']:
   p=Path(sr['file']);need(sha(p)==sr['sha256'],'shard receipt hash '+str(p));need(p not in receiptpaths,'duplicate receipt');receiptpaths.add(p)
   s=read(p); i=s['shard']['index']; shardindexes.add(i)
   need(s['status']=='shard-passed' and s['partial'] is True and s['errors']==[] and s['sourceDrift']==[],'shard status/drift')
   need(s['shard']['count']==count and s['journey']==journey and s['browser']==a['browser'] and s['node']=='v24.22.2','shard metadata')
   need(s['inputs']==inputs and s['inputSha256']==objsha(inputs) and s['lockfileSha256']==inputs['package-lock.json'],'shard frozen inputs')
   need(s['maxRuntimeMs']==1200000 and s['caseRuntimeLimitMs']==(240000 if journey=='campaign' else 60000) and s['elapsedMs']<=s['maxRuntimeMs'],'unchanged deadlines')
   expected=allcases[i-1::count]; need(s['plannedCaseKeys']==[c['key'] for c in expected] and len(s['results'])==len(expected),'shard planned assignment')
   manifest=p.parent/'artifact-manifest.json'; m=read(manifest)
   need(sha(manifest)==s['artifact']['manifestSha256'],'build manifest receipt hash')
   need(m['files']==fresh['buildFiles'] and objsha(m['files'])==s['artifact']['sha256']==fresh['buildSha256'],'fresh build equality')
   need(s['artifact']['files']==47,'build file count')
   expectedartifactpaths=set()
   for row,want in zip(s['results'],expected):
    need(all(row[k]==want[k] for k in ['key','profile','viewport']),'case assignment')
    need(row['status']=='passed' and row['errors']==[] and row['consoleErrors']==[],'case failure/errors')
    need(row['key'] not in rows,'case duplicate');rows[row['key']]=row
    o=row['outcomes']
    if journey=='compact':need(o['referencePhase']=='resolved' and o['referenceAssessment']['passed'] is True and o['failurePhase']!='resolved' and o['failureAssessment']['passed'] is False and o['recoveryPhase']=='resolved' and o['recoveryAssessment']['passed'] is True,'compact outcomes')
    else:
     tracks=['smb','enterprise','government','defence'][:['smb','enterprise','government','defence'].index(row['profile']['scenario'])+1]
     checkpoint=[(t,k) for t in tracks for k in ['window','window','incident','window','orders-pending','orders-active','window','award','renewal-due','renewed']]
     need(o['tracks']==tracks and [(c['track'],c['kind']) for c in o['checkpoints']]==checkpoint and all(c['passed'] is True for c in o['checkpoints']),'campaign checkpoints')
    for field,suffix in [('trace','.trace.zip'),('screenshot','.png')]:
     need(Path(row[field]).name==row['key']+suffix,'artifact reference name'); mapped=BASE/Path(row[field]).relative_to('/evidence');need(mapped==p.parent/(row['key']+suffix),'artifact reference location');expectedartifactpaths.add(str(mapped))
   need({x['file'] for x in sr['artifacts']}==expectedartifactpaths and len(sr['artifacts'])==len(expected)*2,'artifact inventory exact')
   artifactjobs.extend(sr['artifacts']);receiptproof.append({'file':str(p),'sha256':sr['sha256'],'manifestSha256':sha(manifest),'cases':len(expected),'elapsedMs':s['elapsedMs'],'shard':s['shard']})
  need(shardindexes==set(range(1,count+1)) and [rows[k] for k in keys]==a['results'],'aggregate rows exact shard union')
  result['aggregates'].append({'file':str(ap),'sha256':sha(ap),'engine':engine,'journey':journey,'cases':144,'uniqueProfiles':48,'viewports':['desktop','mobile','landscape'],'shards':receiptproof})
  print('checked metadata',engine,journey,flush=True)
 def checkartifact(x):
  p=Path(x['file']);actual=sha(p);need(p.stat().st_size==x['bytes'] and actual==x['sha256'],'artifact mismatch '+str(p));return x
 with ThreadPoolExecutor(max_workers=3) as pool:
  for i,x in enumerate(pool.map(checkartifact,artifactjobs),1):
   result['artifacts'].append(x)
   if i%200==0:print('hashed artifacts',i,'/',len(artifactjobs),flush=True)
 need(len(receiptpaths)==54 and len(artifactjobs)==1728 and len({a['file'] for a in artifactjobs})==1728,'all54/all1728 unique')
 traces=[a['file'] for a in artifactjobs if a['file'].endswith('.trace.zip')]
 ignored=subprocess.run(['git','check-ignore','--stdin'],cwd=ROOT,input='\n'.join(traces)+'\n',text=True,capture_output=True)
 need(ignored.returncode==0 and set(ignored.stdout.splitlines())==set(traces),'traces ignored')
 phase1=read(BASE/'execution.json');phase2=read(BASE/'execution-phase2.json');retained=read(BASE/'phase1-interruption.json');restart=read(BASE/'orchestration-restart-attempt-1.json')
 need(len(phase1['jobs'])==3 and len(phase2['jobs'])==51,'orchestration job counts')
 required={(e,j,i) for e in versions for j,n in [('compact',6),('campaign',12)] for i in range(1,n+1)};executed=set()
 for job in phase1['jobs']+phase2['jobs']:
  need(job['exitCode']==0,'orchestration exit'); key=(job['engine'],job['journey'],job['index']);need(key not in executed,'orchestration duplicate');executed.add(key)
  cmd=job['command'];need('mcr.microsoft.com/playwright:v1.56.0-noble' in cmd and 'core=0' in cmd and '/work' in cmd and 'node' in cmd,'recorded docker environment')
  need(any('src=/tmp/soc-interface-implementation,dst=/work' in x for x in cmd),'frozen mount')
  matches=[p for p in receiptpaths if p.parent.parent.name==job['name']];need(len(matches)==1,'execution receipt mapping')
 need(executed==required and set(retained['retainedReceipts'])=={str(p) for p in receiptpaths if p.parent.parent.name.endswith('01-of-12')},'54 required and retained3')
 result['orchestration']={'phase1Successful':3,'phase2Successful':51,'requiredUniqueShards':54,'records':[{'file':str(BASE/n),'sha256':sha(BASE/n)} for n in ['execution.json','execution-phase2.json','phase1-interruption.json','orchestration-restart-attempt-1.json']],'restartFailure':restart}
 for engine in versions:
  d=BASE/f'{engine}-campaign-02-of-12'; files=sorted(p for p in d.rglob('*') if p.is_file());reports=[p for p in files if p.name=='browser-campaigns.json'];need(files,'incomplete attempt missing')
  item={'engine':engine,'directory':str(d),'files':[{'file':str(p),'sha256':sha(p),'bytes':p.stat().st_size} for p in files],'reports':[{'status':read(p).get('status'),'errors':read(p).get('errors'),'cases':len(read(p).get('results',[]))} for p in reports],'log':{'file':str(BASE/(d.name+'.log')),'sha256':sha(BASE/(d.name+'.log'))}}
  need(not any(p in receiptpaths for p in reports),'interrupted used as success');result['preservedIncompleteAttempts'].append(item)
 pins=read(OLD/'node_modules/playwright-core/browsers.json')['browsers']; selected=[b for b in pins if b['name'] in versions]
 need({b['name']:b['browserVersion'] for b in selected}==versions,'installed locked browser versions')
 result['source']['installedBrowserPins']=selected
 result['limitations']=['This audits retained receipts/artifacts and a freshly reproduced build; it does not rerun browser interactions or inspect every trace event.', 'Docker commands record the pinned noble image tag and Node mount; this audit does not independently attest the historical container image digest.', 'All successful shards retain their partial shard-passed status; only exact aggregate unions establish the six bounded matrix results.', 'Historical defence inputs differ intentionally from current WFM/managed-leaver runtime; no readiness flags or full-product claim follows.']
 result['auditScript']={'file':'/tmp/soc-audit-defence-matrices.py','sha256':sha('/tmp/soc-audit-defence-matrices.py')}
 drift=[k for k,v in inputs.items() if sha(OLD/k)!=v];need(not drift,'audit-time frozen input drift')
 result.update(status='passed',finishedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),sourceDrift=drift,verifiedShardReceipts=54,verifiedArtifacts=1728,verifiedArtifactBytes=sum(x['bytes'] for x in artifactjobs),ignoredTraces=len(traces),browserExecutions=864)
except Exception as e:
 result['status']='failed';result['errors'].append(str(e));raise
finally:
 OUT.write_text(json.dumps(result,indent=2)+'\n')
 print('audit',result['status'],str(OUT),flush=True)
