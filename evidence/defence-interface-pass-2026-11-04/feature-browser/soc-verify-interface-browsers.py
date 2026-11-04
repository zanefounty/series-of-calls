import pathlib,json,hashlib,datetime
root=pathlib.Path('/tmp/soc-interface-browser-final-v2');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();rows=[];artifacts=[];inputs=[];trees=[]
keys={j+'-'+v+'-'+k for j in ['AU','US','JP','EU'] for v in ['desktop','mobile'] for k in ['restricted-handover','restricted-export-blocked','internal-training']}
for engine in ['chromium','firefox','webkit']:
 reports=list((root/engine).glob('*/report.json'));feature=[p for p in reports if not p.parent.name.startswith('keyboard-')];keyboard=[p for p in reports if p.parent.name.startswith('keyboard-')];assert len(feature)==len(keyboard)==1
 for kind,p in [('interface',feature[0]),('keyboard',keyboard[0])]:
  d=json.loads(p.read_text());assert d['status']=='diagnostic-passed' and d['sourceDrift']==[] and d['browser']['engine']==engine;assert d.get('errors',[])==[];assert all(r['status']=='diagnostic-passed' and r['errors']==[] for r in d['results']);assert d['driverSha256']==sha(root/('soc-'+kind+'-ui-browser.js'))
  if kind=='interface':
   assert len(d['results'])==24 and {r['key'] for r in d['results']}==keys and set(d['plannedCases'])==keys;assert d['versions']['playwright']=='1.56.0';assert d['caseLimitMs']==180000 and d['totalLimitMs']==1200000 and d['elapsedMs']<=d['totalLimitMs'];inputs.append(d['inputs']);trees.append(d['artifact']['sha256'])
   for r in d['results']:
    assert len(r['commands'])==len(r['actualCommands'])==len(r['steps'])==21;assert r['exactFixtureOrder'] is True
    blocked=r['profile']['name']=='restricted-export-blocked';assert r['transfer']['status']==('blocked' if blocked else 'complete');assert len(r['records'])==(1 if blocked else 2)
    if blocked:assert r['transfer']['reason']=='POLICY_CLASSIFICATION_EXCEEDED'
  else:
   assert d['playwright']=='1.56.0' and len(d['results'])==2 and {r['viewport']['id'] for r in d['results']}=={'desktop','mobile'}
   for r in d['results']:assert r['beforeSha256']==r['afterSha256'] and r['closeRoutes']==['visible close button','keyboard ?']
   assert d['inputs']=={k:v for k,v in inputs[-1].items() if k!='tests/lib/information-interface-fixture.js'}
  for r in d['results']:
   assert len(r['artifacts'])==2
   for a in r['artifacts']:
    f=p.parent/a['file'];assert f.is_file() and f.stat().st_size==a['bytes'] and sha(f)==a['sha256'];artifacts.append({'file':str(f),**a})
  rows.append({'engine':engine,'kind':kind,'cases':len(d['results']),'report':str(p),'sha256':sha(p),'browser':d['browser'],'sourceDrift':d['sourceDrift']})
assert all(x==inputs[0] for x in inputs) and len(set(trees))==1
execution=json.loads((root/'execution.json').read_text());assert len(execution['jobs'])==6 and all(j['exitCode']==0 for j in execution['jobs'])
result={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'verified-diagnostic','scope':'72 bounded visible interface cases and6 title keyboard viewport checks, not full application acceptance.','interfaceCases':72,'keyboardCases':6,'artifacts':len(artifacts),'matchingInputManifests':True,'matchingBuiltArtifactSha256':trees[0],'receipts':rows,'executionSha256':sha(root/'execution.json')};(root/'verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
