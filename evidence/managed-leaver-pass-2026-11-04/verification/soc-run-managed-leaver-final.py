import pathlib,json,hashlib,subprocess,datetime,concurrent.futures,time
spec=json.loads(pathlib.Path('/tmp/soc-managed-leaver-final-browser-invocation.json').read_text())
driver=pathlib.Path(spec['driver']);assert hashlib.sha256(driver.read_bytes()).hexdigest()=='47da04a18cf74cffdc7bb469ace4863bc34ffc7deca17144592cb5db39d7d2ac'
base=pathlib.Path('/tmp/soc-managed-leaver-ui-final');base.mkdir(exist_ok=False)
report={'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'driverSha256':hashlib.sha256(driver.read_bytes()).hexdigest(),'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=spec['worktree'],text=True).strip(),'imageInspect':json.loads(subprocess.check_output(['docker','image','inspect',spec['image']],text=True))[0]['RepoDigests'],'jobs':[]}
(base/'driver.js').write_bytes(driver.read_bytes())
def run(item):
 out=pathlib.Path(item['hostOutputDirectory']);out.mkdir();start=time.monotonic()
 with (out/'execution.log').open('w') as log:
  try:result=subprocess.run(item['command'],stdout=log,stderr=subprocess.STDOUT,timeout=1260);code=result.returncode
  except subprocess.TimeoutExpired:code=124
 return {'engine':item['engine'],'command':item['command'],'exitCode':code,'seconds':round(time.monotonic()-start,2),'report':item['expectedReport']}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 for result in pool.map(run,spec['commands']):
  report['jobs'].append(result);print(result['engine'],result['exitCode'],flush=True);(base/'execution.json').write_text(json.dumps(report,indent=2)+'\n')
report['finishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();(base/'execution.json').write_text(json.dumps(report,indent=2)+'\n')
raise SystemExit(0 if all(x['exitCode']==0 for x in report['jobs']) else 1)
