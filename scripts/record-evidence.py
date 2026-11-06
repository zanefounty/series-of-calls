#!/usr/bin/env python3
from pathlib import Path
import datetime,hashlib,json,re,subprocess,sys
from verify import acceptance_command,acceptance_results,GateError
root=Path(__file__).resolve().parents[1]
plan=json.loads((root/'spec/acceptance-plan.json').read_text())
planned=[t for suite in plan['suites'].values() for t in suite]
expected=set(planned)
if any(not (root/path).is_file() for path in plan['suites']):sys.exit('Missing acceptance suite')
inputs=plan['inputs']+['spec/acceptance-plan.json']
inputHashes={p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in inputs}
command=acceptance_command(list(plan['suites']))
result=subprocess.run(command,cwd=root,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
out=root/'evidence';out.mkdir(exist_ok=True)
(out/'communications.tap').write_text(result.stdout)
parseError=None
try:
    if len(planned)!=len(expected):raise GateError('Duplicate acceptance plan ID')
    tests=acceptance_results(result.stdout,expected)
except GateError as error:tests={};parseError=str(error)
changedInputs=[p for p,h in inputHashes.items() if not (root/p).is_file() or hashlib.sha256((root/p).read_bytes()).hexdigest()!=h]
if changedInputs:parseError='Acceptance inputs changed during execution: '+', '.join(changedInputs)
report={'runAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'command':command,'runtime':subprocess.check_output(['node','--version'],text=True).strip(),'tests':tests,'failures':0 if result.returncode==0 and parseError is None else 1,'parseError':parseError,'inputs':inputHashes,'changedInputs':changedInputs}
(out/'acceptance.json').write_text(json.dumps(report,indent=2)+'\n')
print(f"Executed {len(tests)} acceptance cases; failures={report['failures']}")
sys.exit(report['failures'])
