#!/usr/bin/env python3
"""Accountability gates. Structural coverage is not evidence of semantic fidelity."""
from pathlib import Path
import argparse, datetime as dt, hashlib, importlib.util, json, os, re, shutil, subprocess, sys, tempfile

ROOT=Path(__file__).resolve().parents[1]
class GateError(Exception):pass
def require(ok,msg):
    if not ok:raise GateError(msg)
def read(root,path):return json.loads((root/path).read_text())
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def age(value,now):
    require(isinstance(value,str),'Missing review/check date')
    try:date=dt.datetime.fromisoformat(value.replace('Z','+00:00')).date()
    except ValueError:raise GateError('Invalid date: '+value)
    require(date<=now,'Future review/check date: '+value)
    return (now-date).days
def unique(records,kind):
    ids=[r['id'] for r in records];require(len(ids)==len(set(ids)),f'Duplicate {kind} ID');return set(ids)
def acceptance_results(output,expected):
    """Only top-level TAP results count; aliases and duplicate titles are invalid."""
    rows=re.findall(r'^(ok|not ok) \d+ - (AC-SOC-\S+)(.*)$',output,re.M)
    require(all(re.fullmatch(r'AC-SOC-\d+',tid) for _,tid,_ in rows),'Invalid executed acceptance ID')
    ids=[tid for _,tid,_ in rows]
    require(len(ids)==len(set(ids)),'Duplicate executed acceptance ID')
    require(set(ids)==set(expected),'Executed acceptance IDs differ from plan')
    require(all(status=='ok' for status,_,_ in rows),'Acceptance tests failed')
    require(all(not re.search(r'#\s*(?:SKIP|TODO)\b',directive,re.I) for _,_,directive in rows),'Skipped acceptance test')
    return {tid:'passed' for tid in ids}
def acceptance_command(suites):
    """Run the unchanged planned suites with normal per-file Node isolation and bounded parallelism."""
    raw=os.environ.get('TEST_JOBS')
    if raw is not None:
        try:jobs=int(raw)
        except ValueError:raise GateError('TEST_JOBS must be a positive integer')
    else:
        try:jobs=len(os.sched_getaffinity(0))
        except (AttributeError,OSError):jobs=os.cpu_count() or 1
    require(jobs>=1,'TEST_JOBS must be a positive integer')
    return ['node','--test','--test-isolation=process',f'--test-concurrency={jobs}','--test-reporter=tap',*suites]
def acceptance_suites(plan,shard=None):
    """Partition whole files deterministically; the complete set of shards is mandatory."""
    suites=plan['suites']
    require(isinstance(suites,dict) and suites,'Missing acceptance suites')
    if shard is None:return dict(suites)
    index,total=shard
    require(type(index) is int and type(total) is int and 1<=index<=total<=len(suites),'Invalid acceptance shard')
    return dict(list(suites.items())[index-1::total])
def acceptance_shard(value):
    match=re.fullmatch(r'([1-9][0-9]*)/([1-9][0-9]*)',value)
    if not match or int(match[1])>int(match[2]):raise argparse.ArgumentTypeError('Expected acceptance shard I/N with 1 <= I <= N')
    return int(match[1]),int(match[2])
def source(root):
    manifest=read(root,'research/source-manifest.json')
    revision=read(root,f"research/revisions/{manifest['revision']}.json")
    require(revision['manifestSha256']==sha(root/'research/source-manifest.json'),'Source manifest changed without an explicit source revision')
    for s in manifest['sources']:
        require((root/s['path']).is_file(),'Missing source: '+s['path'])
        require(sha(root/s['path'])==s['sha256'],'Preserved source changed: '+s['path'])
def coverage(root):
    items=read(root,'spec/generated/source-items.json');reqs=read(root,'spec/generated/requirements.json');acs=read(root,'spec/generated/acceptance.json')
    ids=unique(items,'source');rids=unique(reqs,'requirement');aids=unique(acs,'acceptance')
    for i in items:
        require(i['disposition'] in ['specified','approved-exclusion'],'Missing source disposition: '+i['id'])
        require(i['requirements'] and set(i['requirements'])<=rids,'Unresolved source requirement: '+i['id'])
    for r in reqs:
        require(r['sources'] and set(r['sources'])<=ids,'Requirement lost source: '+r['id'])
        require(r['representation'] and r['acceptance'] and set(r['acceptance'])<=aids,'Requirement lost representation or acceptance: '+r['id'])
        require(r['status'] in ['pending','partial','complete'],'Invalid requirement status')
        if r['status']=='complete':require(r['implementation'],'Completed requirement lacks implementation: '+r['id'])
        else:require(r.get('reason'),'Pending requirement lacks explanation')
    # Regenerate in isolation, so deleting a mapping AND its requirement cannot evade the gate.
    spec=importlib.util.spec_from_file_location('generator',root/'scripts/generate-spec.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
    with tempfile.TemporaryDirectory(prefix='soc-coverage-') as tmp:
        temp=Path(tmp);shutil.copytree(root/'research/source',temp/'research/source');shutil.copy(root/'research/decisions.json',temp/'research/decisions.json')
        shutil.copy(root/'research/additions.json',temp/'research/additions.json')
        (temp/'maintenance/upstream').mkdir(parents=True);shutil.copy(root/'maintenance/upstream/register.json',temp/'maintenance/upstream/register.json')
        (temp/'spec').mkdir();shutil.copy(root/'spec/implementation.json',temp/'spec/implementation.json')
        mod.ROOT=temp
        import contextlib,io
        with contextlib.redirect_stdout(io.StringIO()):mod.generate()
        for folder in ['spec/generated','spec/appendices','research/generated']:
            expected={str(p.relative_to(temp)):sha(p) for p in (temp/folder).rglob('*') if p.is_file()}
            actual={str(p.relative_to(root)):sha(p) for p in (root/folder).rglob('*') if p.is_file()}
            require(actual==expected,'Generated source coverage differs: '+folder)
def mapping(root):
    spec=importlib.util.spec_from_file_location('mapping_audit',root/'scripts/audit-mapping.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);mod.ROOT=root
    require(read(root,'spec/audit/mapping-review.json')==mod.generate(write=False),'Mapping audit omitted or changed a source obligation')
    rows={r['id']:r for r in read(root,'research/source/series-of-calls-full-mapping.json')['rows']}
    narrative=read(root,'content/narrative.json');unique(narrative['entries'],'narrative')
    require(len({e['source'] for e in narrative['entries']})==len(narrative['entries']),'Duplicate narrative source')
    contexts=set()
    for e in narrative['entries']:
        require(e['source'] in rows,'Narrative source unresolved')
        require(e['sourceRecordSha256']==mod.digest(rows[e['source']]),'Narrative source hash differs')
        require(e['name']==rows[e['source']]['uc_name'] and e['comparison'] and e['text'],'Narrative lost its mapped role or comparison')
        require(not contexts.intersection(e['contexts']),'Ambiguous narrative context');contexts.update(e['contexts'])
    require(contexts<={p['id'] for p in read(root,'content/contracts.json')['products']},'Unknown narrative configuration context')
def catalogue(root):
    c=read(root,'content/contracts.json');ids=unique(c['products'],'product');units=set(c['units'])
    sources=unique(read(root,'spec/generated/source-items.json'),'source');products={p['id']:p for p in c['products']}
    runtime=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify(require('./src/game/55-communications.js').catalogue))"],cwd=root,text=True))
    require(set(runtime)==ids,'Catalogue differs from configured runtime products')
    for p in c['products']:
        require(p['unit'] in units,'Unknown resource unit: '+p['id'])
        require(p['sourceIds'] and set(p['sourceIds'])<=sources,'Missing product provenance: '+p['id'])
        require(all(runtime[p['id']][key]==p[key] for key in ['name','unit','console']) and runtime[p['id']]['defaults']==p['configuration'],'Product contract differs from runtime: '+p['id'])
        for d in p['dependencies']:
            require(d['target'] in ids and d['unit'] in units and d['field'] in p['configuration'],'Invalid dependency relationship: '+p['id'])
            require(d['unit']==products[d['target']]['unit'],'Dependency unit mismatch: '+p['id'])
    for edge in c['compatibility']:
        require(edge['from'] in ids and edge['to'] in ids,'Unresolved compatibility edge')
        require(edge['direction'] in ['forward','bidirectional'] and edge['features'] and edge['versions'] and edge['supportOwner'],'Unscoped compatibility edge')
        require(edge['evidenceStatus'] in ['scenario-tested','unknown'],'Real certification must not be inferred')
    require(not c.get('bandwidthToSeats'),'Bandwidth must never be converted into seats')
    for name,key in [('business','offers'),('operations','schemas'),('information','schemas'),('contact','defaults'),('calling','defaults')]:
        pack=read(root,'content/'+name+'.json')
        module={'business':'54-business','operations':'53-service-operations','information':'52-information','contact':'51-contact','calling':'50-calling'}[name]
        actual=json.loads(subprocess.check_output(['node','-e',f"console.log(JSON.stringify(require('./src/game/{module}.js')))"],cwd=root,text=True))
        require(pack['pack']==actual['PACK'] and pack[key]==actual[key],'Versioned '+name+' catalogue differs from runtime')
        require(pack['sourceIds'] and set(pack['sourceIds'])<=sources,'Missing '+name+' catalogue provenance')
        if name=='operations':
            require(pack['features']==actual['features'],'Integration feature matrix differs from runtime')
            require(pack.get('numberPorting')==actual['numberPorting'],'Number port supplier calendar/rules differ from runtime')
        elif name=='information':require(pack['steps']==actual['steps'],'Processing dependency matrix differs from runtime')
        elif name=='business':
            for offer in pack['offers'].values():
                require(offer['unit'] in units and (offer['usageUnit'] is None or offer['usageUnit'] in units),'Invalid charging dimension')
                require(set(offer['kinds'])<=ids and offer['minimum']>0,'Invalid offer resource relationship')
    # These runtime packs have versioned content snapshots as well as explanatory
    # content. Compare the exported static rules themselves, not just pack names.
    parity=[
        ('product-evidence','28-product-evidence',['PACK','VERSION','TTL','evidenceTypes','sourceIds']),
        ('managed-operations','29-managed-operations',['PACK','VERSION','CONTENT','OFFER','UNIT','OPERATIONS']),
        ('media-negotiation','30-media-negotiation',['PACK','VERSION','CODECS']),
        ('site-operations','32-site-operations',['PACK','VERSION','GOALS']),
        ('calling-achievements','33-calling-achievements',['PACK','VERSION','goalIds','sourceIds']),
        ('capability-progression','31-capability-progression',['PACK','VERSION','CONTENT','levelIds','goalIds','implementedLevels','implementedGoals','sourceIds']),
        ('shared-services','35-shared-services',['PACK','VERSION','defaults','rights','presenceStates']),
        ('market-qualification','36-market-qualification',['PACK','VERSION','CONTENT','GOALS','sourceIds','markets','thresholds']),
        ('specialist-lifecycle','34-specialist-lifecycle',['PACK','VERSION','AS_OF_DATE','evidenceTypes','saleStates','renewalStates','supportStates']),
        ('admission-security','38-admission-security',['PACK','VERSION','controls','methods','sourceIds','defaults']),
        ('portfolio','37-portfolio',['PACK','VERSION','CONTENT','MAX_CUSTOMERS','MAX_CATCHUP_MINUTES','markets','scenarios']),
        ('service-observation','39-service-observation',['PACK','VERSION','CONTENT','GOALS','sourceIds','thresholds','required']),
        ('issue-exercises','40-issue-exercises',['PACK','VERSION','definitions','pending']),
        ('progression','41-progression',['PACK','VERSION','CONTENT','levelIds','goalIds','implementedGoals','implementedLevels']),
        ('transport','42-transport',['PACK','profiles']),
        ('boundaries','43-boundaries',['PACK','VERSION','profiles']),
        ('campaign','44-campaign',['PACK','VERSION','CONTENT','tracks']),
        ('products','45-products',['PACK','VERSION','units','families']),
        ('outcomes','46-outcomes',['PACK','defaults']),
        ('channels','47-channels',['channels','defaults','witty'])]
    for name,module,keys in parity:
        pack=read(root,'content/'+name+'.json')
        code="const x=require('./src/game/%s.js'); console.log(JSON.stringify(Object.fromEntries(%s.map(k=>[k,x[k]]))))"%(module,json.dumps(keys))
        actual=json.loads(subprocess.check_output(['node','-e',code],cwd=root,text=True))
        require(pack.get('runtime')==actual,'Versioned '+name+' runtime profile/rules differ from runtime pack')
        refs=pack.get('sourceIds',[])
        if name=='boundaries':refs=[sid for profile in pack.get('profiles',{}).values() for sid in profile.get('sourceIds',[])]
        elif name=='progression':refs=[row['sourceId'] for row in pack['records']]
        elif name=='issue-exercises':refs=[row['source_id'] for row in pack['exercises']]
        require(isinstance(refs,list) and refs and set(refs)<=sources,'Missing '+name+' runtime content provenance')
    portfolio=read(root,'content/portfolio.json')
    require(portfolio['customerLimit']==portfolio['runtime']['MAX_CUSTOMERS'],'Portfolio customer limit drift')
    market=read(root,'content/market-qualification.json')
    require(market['thresholds']==market['runtime']['thresholds'],'Market qualification threshold drift')
    observation=read(root,'content/service-observation.json')
    require(observation['thresholds']==observation['runtime']['thresholds'],'Observation threshold drift')
    # Keep the human-readable boundary and campaign records useful and aligned
    # with their executable snapshots instead of allowing a stale parallel spec.
    boundary=read(root,'content/boundaries.json');bp=boundary['profiles'];runtime_b=boundary['runtime']['profiles']
    require(set(bp)==set(runtime_b),'Boundary content profiles differ from runtime')
    for region,profile in bp.items():
        require(profile.get('fictionalRule')==runtime_b[region]['fictionalRule'] and profile.get('sourceIds')==runtime_b[region]['sourceIds'] and isinstance(profile.get('description'),str) and profile['description'].strip(),'Boundary profile description/rule/provenance drift: '+region)
        require(set(profile['sourceIds'])<=sources,'Boundary profile lost source provenance: '+region)
    campaign=read(root,'content/campaign.json');runtime_tracks=campaign['runtime']['tracks']
    tracks={t['id']:t for t in campaign['tracks']}
    require(set(tracks)==set(runtime_tracks),'Campaign content tracks differ from runtime')
    for key,track in tracks.items():
        r=runtime_tracks[key]
        incident=track.get('incident',{});domain=r['incident'].get('resource','external-connectivity');trigger='fault' if r['incident']['kind']=='fault' else 'disconnect'
        require(track.get('sequence')==r['sequence'] and track.get('predecessor')==r['predecessor'] and track.get('requiredResources')==r['resources'] and track.get('windows')==r['windows'] and incident.get('failureDomain')==domain and incident.get('trigger')==trigger and incident.get('recovery'),'Campaign track rule drift: '+key)
        require(track.get('title') and track.get('distinctTask') and track.get('economics'),'Campaign explanatory content missing: '+key)
    exercises=read(root,'content/issue-exercises.json');definitions=exercises['runtime']['definitions']
    require(len(exercises['exercises'])==len(definitions) and {e['id'] for e in exercises['exercises']}==set(definitions),'Issue exercise inventory differs from runtime')
    for e in exercises['exercises']:
        d=definitions[e['id']]
        require(e['source_id']==d['source']['id'] and e['source_url']==d['source']['url'] and e['source_date']==d['source']['date'],'Issue exercise lost source lineage')
        require(e['reference_commands']==[{'action':'step','exercise':e['id'],'step':step} for step in d['steps']],'Issue exercise command sequence drift')
    progression=read(root,'content/progression.json');runtime=progression['runtime'];all_rows=runtime['levelIds']+runtime['goalIds']
    require(len(progression['records'])==len(all_rows) and {r['sourceId'] for r in progression['records']}==set(all_rows),'Progression source inventory differs from runtime')
    require(progression['implementedSourceRows']==runtime['implementedGoals']+runtime['implementedLevels'] and set(progression['pendingSourceRows'])==set(all_rows)-set(progression['implementedSourceRows']),'Progression mechanic/pending partition differs from runtime')
    original={r['id']:r for r in read(root,'research/source/series-of-calls-full-mapping.json')['rows']}
    for row in progression['records']:
        src=original[row['sourceId']]
        require(row['original']['attributes']==src['original_attributes'] and row['original']['sha256']==hashlib.sha256(json.dumps(src,sort_keys=True,ensure_ascii=False).encode()).hexdigest(),'Progression original source changed')
def evidence(root,shard=None):
    index=read(root,'spec/implementation.json');unique(index['behaviours'],'behaviour')
    sources=unique(read(root,'spec/generated/source-items.json'),'source')
    report=read(root,'evidence/acceptance.json')
    plan=read(root,'spec/acceptance-plan.json')
    require(set(report['inputs'])==set(plan['inputs'])|{'spec/acceptance-plan.json'},'Acceptance input inventory is incomplete')
    planned=[t for suite in plan['suites'].values() for t in suite]
    require(len(planned)==len(set(planned)),'Duplicate acceptance plan ID')
    require(report['failures']==0,'Acceptance tests failed')
    require(report['tests'],'Acceptance evidence is empty')
    for path,digest in report['inputs'].items():require((root/path).is_file() and sha(root/path)==digest,'Evidence input changed or deleted: '+path)
    for b in index['behaviours']:
        require(b['sources'] and set(b['sources'])<=sources,'Behaviour lost provenance: '+b['id'])
        for path in b['implementation']:require((root/path).is_file(),'Missing implementation: '+path)
        require(set(b['implementation'])<=set(report['inputs']),'Behaviour implementation absent from tested inputs')
        require(b['testIds'] and all(t in report['tests'] and report['tests'][t]=='passed' for t in b['testIds']),'Missing or failing acceptance evidence: '+b['id'])
    # Re-run the tests. A forged receipt or a filename cannot establish completion.
    plan=read(root,'spec/acceptance-plan.json')
    require(all(re.fullmatch(r'tests/[a-z0-9-]+\.test\.js',p) for p in plan['suites']),'Invalid acceptance suite path')
    require(all((root/p).is_file() for p in plan['suites']),'Missing acceptance suite')
    require(set(report['tests'])=={t for suite in plan['suites'].values() for t in suite},'Acceptance plan differs from reported tests')
    selected=acceptance_suites(plan,shard)
    expected={tid for ids in selected.values() for tid in ids}
    result=subprocess.run(acceptance_command(list(selected)),cwd=root,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
    require(result.returncode==0,'Current behavioural tests fail: '+result.stdout[-1500:])
    for path,digest in report['inputs'].items():require((root/path).is_file() and sha(root/path)==digest,'Evidence input changed during replay: '+path)
    executed=set(acceptance_results(result.stdout,expected))
    require(expected==executed,'Reported test IDs differ from executed tests')
    for tid in {t for b in index['behaviours'] for t in b['testIds']} & expected:require(tid in executed,'Test ID not executed: '+tid)
def upstream_evidence_subject(collection,item):
    if collection=='commits':return {'collection':collection,'sha':item['sha']}
    return {'collection':collection,'path':item['path'],'blob':item['blob']}
def upstream_receipt_path(collection,item):
    subject=upstream_evidence_subject(collection,item)
    key=subject.get('sha') or hashlib.sha256(json.dumps(subject,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    prefix='commit' if collection=='commits' else collection.removesuffix('s')
    return f'evidence/upstream-adoption/{prefix}-{key}.json'
def verify_upstream_adoption_evidence(root,item,collection,plan):
    """Evidence v1 uses a scoped immutable receipt, independent of the global test report.

    Register ``evidence`` is exactly one relative receipt path. The receipt is
    {schemaVersion,subject,implementation,inputs,suites}; implementation is a
    unique list of scoped source paths, inputs is a unique list of {path,sha256}
    for implementation/test inputs, while suites is a unique list of
    {path,ids,log}. Each log is {path,sha256}, contains TAP output from the
    complete named acceptance-plan suite, and is stored under
    evidence/upstream-adoption/logs/. File hashes, stored TAP IDs/results, and a
    fresh execution of each suite are all checked. This receipt deliberately
    does not hash evidence/acceptance.json or the mutable upstream register.
    """
    evidence=item.get('evidence')
    expected_receipt=upstream_receipt_path(collection,item)
    require(isinstance(evidence,list) and evidence==[expected_receipt],'Upstream adoption lacks its subject-scoped receipt: '+expected_receipt)
    require((root/expected_receipt).is_file(),'Missing upstream adoption receipt: '+expected_receipt)
    receipt=read(root,expected_receipt)
    require(isinstance(receipt,dict) and set(receipt)=={'schemaVersion','subject','implementation','inputs','suites'} and receipt.get('schemaVersion')==1,'Invalid upstream adoption receipt schema')
    require(receipt.get('subject')==upstream_evidence_subject(collection,item),'Upstream evidence subject does not match its registered row')
    implementation=receipt.get('implementation');inputs=receipt.get('inputs');suites=receipt.get('suites')
    require(isinstance(implementation,list) and 1<=len(implementation)<=300 and all(isinstance(x,str) for x in implementation) and len(implementation)==len(set(implementation)) and isinstance(inputs,list) and 1<=len(inputs)<=1000 and isinstance(suites,list) and 1<=len(suites)<=100,'Invalid upstream receipt implementation/input/suite bounds')
    def safe_repo_path(path):
        return isinstance(path,str) and bool(path) and not Path(path).is_absolute() and '..' not in Path(path).parts and Path(path).as_posix()==path and not path.startswith('.git/') and path not in {'maintenance/upstream/register.json','evidence/acceptance.json'} and not path.startswith('evidence/upstream-adoption/')
    require(all(safe_repo_path(path) for path in implementation),'Invalid upstream implementation path')
    input_hashes={}
    for source in inputs:
        require(isinstance(source,dict) and set(source)=={'path','sha256'},'Invalid upstream receipt input record')
        path=source['path'];digest=source['sha256']
        require(safe_repo_path(path),'Invalid upstream receipt input path')
        require(path not in input_hashes,'Duplicate upstream receipt input path')
        full=root/path
        require(full.is_file() and isinstance(digest,str) and re.fullmatch(r'[0-9a-f]{64}',digest) and sha(full)==digest,'Upstream receipt input missing or hash mismatch: '+path)
        input_hashes[path]=digest
    require(set(implementation)<=set(input_hashes),'Upstream implementation paths lack exact input hashes')
    suite_runs={}
    for suite in suites:
        require(isinstance(suite,dict) and set(suite)=={'path','ids','log'},'Invalid upstream receipt suite record')
        test_path=suite['path'];ids=suite['ids'];planned=plan.get('suites',{}).get(test_path)
        require(isinstance(test_path,str) and isinstance(planned,list) and test_path in input_hashes,'Upstream receipt test file is absent from exact inputs')
        require(isinstance(ids,list) and bool(ids) and all(isinstance(x,str) and re.fullmatch(r'AC-SOC-\d+',x) for x in ids) and len(ids)==len(set(ids)) and len(planned)==len(set(planned)) and set(ids)==set(planned),'Upstream receipt must name the complete planned test suite: '+str(test_path))
        require(test_path not in suite_runs,'Duplicate upstream receipt test suite: '+test_path)
        log=suite['log'];require(isinstance(log,dict) and set(log)=={'path','sha256'},'Invalid upstream TAP log record')
        log_path=log['path'];log_sha=log['sha256']
        require(isinstance(log_path,str) and log_path.startswith('evidence/upstream-adoption/logs/') and log_path.endswith('.tap') and not Path(log_path).is_absolute() and '..' not in Path(log_path).parts and Path(log_path).as_posix()==log_path,'Invalid upstream TAP log path')
        log_file=root/log_path;require(log_file.is_file() and log_file.stat().st_size<=2_000_000 and isinstance(log_sha,str) and re.fullmatch(r'[0-9a-f]{64}',log_sha) and sha(log_file)==log_sha,'Upstream TAP log missing or hash mismatch')
        try:stored_output=log_file.read_text()
        except UnicodeDecodeError:require(False,'Upstream TAP log is not UTF-8')
        acceptance_results(stored_output,ids)
        suite_runs[test_path]=set(ids)
    for test_path,ids in suite_runs.items():
        result=subprocess.run(['node','--test','--test-isolation=none','--test-reporter=tap',test_path],cwd=root,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
        require(result.returncode==0,'Upstream evidence test suite failed: '+test_path+' '+result.stdout[-1000:])
        acceptance_results(result.stdout,ids)
def upstream(root,now,release=False):
    u=read(root,'maintenance/upstream/register.json');raw=read(root,'maintenance/upstream/tree.json');commits=read(root,'maintenance/upstream/commits.json');comparison=read(root,'maintenance/upstream/comparison.json')
    require(u['latestObserved']==raw['sha'],'Latest observed upstream revision mismatch')
    require(not raw['truncated'],'Incomplete upstream tree')
    require(len(commits)==comparison['total_commits'] and len(set(c['sha'] for c in commits))==len(commits),'Incomplete upstream commit inventory')
    require({c['sha'] for c in commits}<={c['sha'] for c in u['commits']},'Upstream commit disappeared from register')
    require({f['path'] for f in raw['tree'] if f['type']=='blob'}<={f['path'] for f in u['files']},'Upstream file disappeared from register')
    unique([{'id':c['sha']} for c in u['commits']],'upstream commit');unique([{'id':f['path']} for f in u['files']],'upstream file')
    for observation in u.get('observations',[]):
        old=read(root,observation)
        require({c['sha'] for c in old['commits']}<={c['sha'] for c in u['commits']},'Historical upstream commit disappeared')
        require({f['path'] for f in old['files']}<={f['path'] for f in u['files']},'Historical upstream file disappeared')
        require({(f['path'],f['sha']) for f in old['files'] if f['type']=='blob'}<={(f['path'],f['blob']) for f in u['fileVersions']},'Historical upstream file version disappeared')
    require({(f['filename'],f['status'],f.get('previous_filename')) for f in comparison['files']}=={(f['path'],f['change'],f.get('previousPath')) for f in u['changes']},'Upstream change or rename disappeared')
    require({(f['path'],f['sha']) for f in raw['tree'] if f['type']=='blob'}<={(f['path'],f['blob']) for f in u['fileVersions']},'Upstream file version disappeared')
    verified=[(collection,c) for collection in ['commits','files','fileVersions'] for c in u[collection] if c['status']=='verified']
    acceptance_plan=read(root,'spec/acceptance-plan.json') if verified else None
    for collection in ['commits','files','fileVersions']:
      for c in u[collection]:
        elapsed=age(c['detectedAt'],now)
        require(c['disposition'] in [None,'copy','adapt','already-covered','explicitly-excluded'],'Invalid upstream disposition')
        if c['disposition'] is None:require(elapsed<=7,'Upstream change classification overdue')
        if c['disposition']=='explicitly-excluded':require(c.get('approvedBy')=='zanefounty' and c.get('approvalUrl') and c.get('rationale'),'Unapproved upstream exclusion')
        if c['status']=='verified':verify_upstream_adoption_evidence(root,c,collection,acceptance_plan)
        if release and c['status']!='verified' and c['disposition']!='explicitly-excluded':require(elapsed<=(7 if c.get('urgent') else 30),'Upstream adoption overdue')
    if release:require(age(u['lastSuccessfulCheck'],now)<=14,'Upstream successful check older than 14 days')
def freshness(root,now,release=False):
    refs=read(root,'research/generated/references.json');reviews=read(root,'research/reviews.json');unique(reviews,'review')
    by={r['reference']:r for r in reviews}
    for ref in refs:
        if ref['activeJurisdictionClaim']:
            require(ref['id'] in by,'Active jurisdiction claim lacks review')
            require(age(by[ref['id']]['acceptedAt'],now)<=90,'Jurisdiction review expired')
        if release:require(ref['id'] in by,'Unreviewed research reference: '+ref['id'])
    if release:
        obs=read(root,'maintenance/reference-check.json');require(age(obs['lastSuccessfulCheck'],now)<=31,'Monthly reference observation overdue')
def release(root,now):
    source(root);coverage(root);mapping(root);catalogue(root);evidence(root)
    upstream(root,now,True);freshness(root,now,True)
    reqs=read(root,'spec/generated/requirements.json');resolved=read(root,'spec/dispositions.json')
    require(all(r['id'] in resolved and resolved[r['id']]['status'] in ['verified','approved-exclusion'] for r in reqs),'Full release blocked: requirements remain pending')
    behaviours={b['id']:b for b in read(root,'spec/implementation.json')['behaviours']}
    for r in reqs:
        d=resolved[r['id']]
        if d['status']=='approved-exclusion':require(d.get('approvedBy')=='zanefounty' and d.get('approvalUrl') and d.get('rationale'),'Unapproved requirement exclusion')
        else:
            require(d.get('behaviours') and set(d['behaviours'])<=set(behaviours),'Missing requirement behaviour evidence')
            linked=[behaviours[b] for b in d['behaviours']]
            require(set(r['sources'])<=set(s for b in linked for s in b['sources']),'Requirement evidence does not cover its sources')
            require(d.get('acceptance') and set(d['acceptance'])<=set(t for b in linked for t in b['testIds']),'Missing requirement acceptance evidence')
    r=read(root,'maintenance/readiness.json')
    required={'independentPublicRepository','completeUpstreamHistory','lockedDependencyBaseline','fullBrowserAcceptance','branchProtection','enforcedApiBudget','enabledMaintenance','completeSpecificationReview'}
    require(set(r)==required and all(v is True for v in r.values()),'Repository, history, browser, protection or maintenance readiness incomplete')
    require((root/'.git').is_dir(),'Complete Git history is absent')
    def git(*args):return subprocess.check_output(['git',*args],cwd=root,text=True).strip()
    require(git('rev-parse','--is-shallow-repository')=='false','Shallow history cannot establish upstream preservation')
    require(git('remote','get-url','upstream')=='https://github.com/fjaeckel/seriesoftubes.git','Incorrect upstream remote')
    require(git('remote','get-url','origin')=='https://github.com/zanefounty/series-of-calls.git','Incorrect independent origin')
    subprocess.run(['git','merge-base','--is-ancestor',read(root,'maintenance/upstream/register.json')['latestObserved'],'HEAD'],cwd=root,check=True)
    browser=read(root,'evidence/browser.json')
    require(browser.get('status')=='passed' and browser.get('offline')=='passed','Missing browser/offline acceptance')
    require(browser.get('inputs'),'Browser acceptance lacks tested input hashes')
    for path,digest in browser['inputs'].items():require((root/path).is_file() and sha(root/path)==digest,'Browser acceptance is stale: '+path)
def main():
    parser=argparse.ArgumentParser();parser.add_argument('gate',choices=['source','coverage','mapping','catalogue','evidence','upstream','freshness','release','all']);parser.add_argument('--acceptance-shard',type=acceptance_shard);args=parser.parse_args()
    if args.acceptance_shard and args.gate not in ['all','evidence']:parser.error('--acceptance-shard is only supported for all/evidence; release always replays the complete plan')
    now=dt.datetime.now(dt.timezone.utc).date()
    gates={'source':lambda:source(ROOT),'coverage':lambda:coverage(ROOT),'mapping':lambda:mapping(ROOT),'catalogue':lambda:catalogue(ROOT),'evidence':lambda:evidence(ROOT,args.acceptance_shard),'upstream':lambda:upstream(ROOT,now),'freshness':lambda:freshness(ROOT,now),'release':lambda:release(ROOT,now)}
    try:
        for k in (list(gates)[:-1] if args.gate=='all' else [args.gate]):
            gates[k]();print('PASS '+k+(f' (shard {args.acceptance_shard[0]}/{args.acceptance_shard[1]}; all shards required)' if k=='evidence' and args.acceptance_shard else ''))
    except (GateError,KeyError,ValueError,FileNotFoundError,subprocess.CalledProcessError) as e:print('FAIL '+str(e),file=sys.stderr);return 1
    return 0
if __name__=='__main__':sys.exit(main())
