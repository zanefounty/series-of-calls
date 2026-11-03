#!/usr/bin/env python3
"""Trusted publisher checks the patch without running proposed code."""
import pathlib,re,subprocess,sys
PROTECTED={'tests/progression-market.test.js','tests/number-porting.test.js','tests/number-porting-ui.test.js','tests/number-porting-integration.test.js','tests/market-integration.test.js','tests/helpers/market-fixture.js','tests/shared-services.test.js','tests/shared-services-ui.test.js','tests/shared-services-integration.test.js','tests/market-qualification.test.js','tests/market-ui.test.js','tests/specialist-lifecycle.test.js','tests/specialist-lifecycle-ui.test.js','tests/specialist-lifecycle-integration.test.js','tests/admission-security-integration.test.js','tests/security-ui.test.js','tests/portfolio.test.js','tests/admission-security.test.js','tests/service-observation.test.js','tests/portfolio-integration.test.js','tests/portfolio-ui.test.js','tests/progression-observation.test.js','tests/observation-ui.test.js','tests/gates_test.py','tests/communications.test.js','tests/business.test.js','tests/service-operations.test.js','tests/information.test.js','tests/contact.test.js','tests/agent_patch_test.py','tests/observations_test.py','tests/calling-policy.test.js','tests/workforce-operations.test.js','tests/estate-operations.test.js','tests/estate-lifecycle-integration.test.js','tests/packs-integration.test.js','tests/module-boundaries.test.js','tests/assessment-packs.test.js','tests/narrative.test.js','tests/service-admin-ui.test.js','tests/products.test.js','tests/outcomes.test.js','tests/channels.test.js','tests/product-integration.test.js','tests/advanced-boundaries.test.js','tests/advanced-admin-ui.test.js','tests/domain-admin-ui.test.js','tests/domain-integration.test.js','tests/journey-integration.test.js','tests/boundaries.test.js','tests/transport.test.js','tests/transport-boundaries.test.js','tests/campaign.test.js','tests/campaign-integration.test.js','tests/issue-exercises.test.js','tests/progression.test.js','tests/learning-integration.test.js'}
def validate(raw):
 if len(raw)>2_000_000:raise ValueError('Patch too large for unattended adoption')
 text=raw.decode('utf-8')
 if not text.strip():raise ValueError('Empty adaptation patch')
 for line in text.splitlines():
  if line.startswith(('GIT binary patch','Binary files ','new file mode 120000','new file mode 160000','old mode ','new mode ','rename from ','rename to ','copy from ','copy to ')):
   raise ValueError('Binary, rename, copy, symlink, submodule or mode changes require owner review')
 paths=[];headers=0
 for line in text.splitlines():
  if line.startswith('diff --git '):
   m=re.fullmatch(r'diff --git a/([a-zA-Z0-9_./-]+) b/([a-zA-Z0-9_./-]+)',line)
   if not m or m[1]!=m[2]:raise ValueError('Invalid diff header')
   paths.extend([m[1],m[2]]);headers+=1
  elif line.startswith(('--- ','+++ ')):
   name=line[4:]
   if name=='/dev/null':continue
   if not name.startswith(('a/','b/')):raise ValueError('Invalid patch path')
   paths.append(name[2:])
 if not headers:raise ValueError('Missing diff headers')
 for name in paths:
  if not re.fullmatch(r'[a-zA-Z0-9_./-]+',name) or any(x in ('','..','.') for x in name.split('/')):raise ValueError('Unsafe patch path')
  if not name.startswith(('src/','site/','tests/')) or name in PROTECTED:raise ValueError('Governance or unsupported path: '+name)
 return paths
if __name__=='__main__':
 p=pathlib.Path(sys.argv[1]);validate(p.read_bytes())
 subprocess.run(['git','apply','--check',str(p.resolve())],check=True)
 print('Patch paths and applicability verified; behavioural validation is still required')
