#!/usr/bin/env python3
"""Record bounded milestone verification, without claiming full release acceptance."""
import datetime,hashlib,json,os,pathlib,re,subprocess,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
def main():
 suites=['capability-progression']+['product-evidence', 'product-evidence-integration', 'product-evidence-ui', 'managed-operations', 'managed-integration', 'managed-operations-ui', 'media-negotiation', 'media-integration', 'media-ui', 'product-rebase']+['calling-achievements','progression-calling','inbound-calling', 'interaction-ui', 'site-integration', 'site-operations', 'site-ui']+['progression-market','number-porting', 'number-porting-ui', 'number-porting-integration','market-integration','shared-services', 'shared-services-ui', 'shared-services-integration', 'market-qualification', 'market-ui', 'specialist-lifecycle', 'specialist-lifecycle-ui', 'specialist-lifecycle-integration','preview-server','admission-security-integration','security-ui','portfolio', 'admission-security', 'service-observation', 'portfolio-integration', 'portfolio-ui', 'progression-observation', 'observation-ui','communications','business','service-operations','information','contact','calling-policy','workforce-operations','estate-operations','estate-lifecycle-integration','packs-integration','module-boundaries','assessment-packs','narrative','service-admin-ui','advanced-admin-ui','domain-admin-ui','domain-integration','campaign','campaign-integration','progression','issue-exercises','learning-integration','channels','outcomes','products','product-integration','advanced-boundaries','journey-integration','boundaries','transport','transport-boundaries','training-console','calls-mcp','calls-offline','build','pages','persist','save-slots','save-size']
 missing=[f'tests/{suite}.test.js' for suite in suites if not (ROOT/f'tests/{suite}.test.js').is_file()]
 if missing:
  print('Missing foundation test suites: '+', '.join(missing),file=sys.stderr)
  return 2
 steps=[('foundation-tests',['node','--test','--test-isolation=none','--test-reporter=tap',*['tests/'+s+'.test.js' for s in suites]]),('acceptance',['python3','scripts/record-evidence.py']),('gates',['python3','scripts/verify.py','all']),('gate-mutations',['python3','-m','unittest','discover','-s','tests','-p','*_test.py']),('translations',['node','scripts/i18n-check.js']),('build',['node','scripts/build.js'])]
 report={'scope':'Foundation and selected inherited persistence/build checks; not full conversion acceptance','checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'results':[],'browser':{'status':'blocked','details':'maintenance/browser-access.md'},'fullUpstreamSuite':'See evidence/deployment-review/current-suite-results.json and FULL-SUITE-REVIEW.md for the complete suite audit; the locked-dependency baseline remains separate','repository':'Not created or published; complete Git history unavailable','dependencyOverrideUsed':bool(os.environ.get('NODE_PATH'))}
 for name,cmd in steps:
  try:
   result=subprocess.run(cmd,cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=180)
   output=result.stdout;code=result.returncode
  except subprocess.TimeoutExpired as e:output='Timed out after 180 seconds';code=124
  log='evidence/'+name+'.log';(ROOT/log).write_text(output)
  row={'step':name,'exitCode':code,'status':'passed' if code==0 else 'failed','log':log,'logSha256':hashlib.sha256(output.encode()).hexdigest()}
  if name=='foundation-tests':row['counts']={k:int(v) for k,v in re.findall(r'^# (tests|pass|fail|skipped) (\d+)$',output,re.M)}
  report['results'].append(row);print(name+': '+row['status'],flush=True)
 result=subprocess.run(['python3','scripts/verify.py','release'],cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 report['release']={'status':'blocked' if result.returncode else 'eligible','reason':result.stdout.strip()}
 inputs={}
 for folder in ['src','site','scripts','tests','content','spec','research','maintenance']:
  for p in (ROOT/folder).rglob('*'):
   if p.is_file() and '__pycache__' not in p.parts:inputs[str(p.relative_to(ROOT))]=hashlib.sha256(p.read_bytes()).hexdigest()
 for name in ['package.json','package-lock.json','LICENSE','NOTICE','THIRD_PARTY_NOTICES.md','README.md','STATUS.md','CHANGELOG.md','CONTRIBUTING.md','CODE_OF_CONDUCT.md','SECURITY.md']:
  p=ROOT/name
  if p.is_file():inputs[name]=hashlib.sha256(p.read_bytes()).hexdigest()
 report['inputs']=inputs
 (ROOT/'evidence/verification.json').write_text(json.dumps(report,indent=2)+'\n')
 return int(any(r['exitCode'] for r in report['results']))
if __name__=='__main__':sys.exit(main())
