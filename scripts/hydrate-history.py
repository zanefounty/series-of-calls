#!/usr/bin/env python3
"""Attach the complete genuine upstream history to this connector-acquired snapshot.
Run when GitHub shell connectivity is available. Does not fabricate commits or publish.
"""
import json,pathlib,shutil,subprocess,tempfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
def main():
    if (ROOT/'.git').exists():raise SystemExit('Refusing to replace existing Git metadata')
    pin=json.loads((ROOT/'maintenance/upstream/register.json').read_text())['latestObserved']
    with tempfile.TemporaryDirectory(prefix='soc-history-') as tmp:
        checkout=pathlib.Path(tmp)/'upstream'
        subprocess.run(['git','clone','--origin','upstream','https://github.com/fjaeckel/seriesoftubes.git',str(checkout)],check=True)
        subprocess.run(['git','checkout','-B','main',pin],cwd=checkout,check=True)
        subprocess.run(['git','fsck','--full'],cwd=checkout,check=True)
        subprocess.run(['git','remote','add','origin','https://github.com/zanefounty/series-of-calls.git'],cwd=checkout,check=True)
        # Copy Git metadata last; preserve every authored local file and intentional deletion.
        shutil.copytree(checkout/'.git',ROOT/'.git')
    print('Full history attached. Review git status, run locked-dependency checks, then create the independent public repository and commit/push.')
if __name__=='__main__':main()
