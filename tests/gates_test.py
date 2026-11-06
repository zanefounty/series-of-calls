import datetime as dt,hashlib,importlib.util,json,pathlib,shutil,subprocess,tempfile,unittest
from contextlib import ExitStack
from unittest import mock
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('verify',ROOT/'scripts/verify.py');V=importlib.util.module_from_spec(spec);spec.loader.exec_module(V)
class Gates(unittest.TestCase):
 def test_number_port_calendar_drift(self):
  self.change('content/operations.json',lambda d:d['numberPorting'].update(minutesPerDay=60))
  with self.assertRaisesRegex(V.GateError,'Number port supplier calendar/rules differ'):V.catalogue(self.root)
 def test_shared_line_runtime_drift(self):
  self.change('content/shared-services.json',lambda d:d['runtime']['defaults'].update(capacity=500))
  with self.assertRaisesRegex(V.GateError,'shared-services runtime profile/rules differ'):V.catalogue(self.root)
 def test_market_threshold_drift(self):
  self.change('content/market-qualification.json',lambda d:d['thresholds']['c3'].update(minutes=1))
  with self.assertRaisesRegex(V.GateError,'Market qualification threshold drift'):V.catalogue(self.root)
 def test_lifecycle_axes_drift(self):
  self.change('content/specialist-lifecycle.json',lambda d:d['runtime']['renewalStates'].append('sale-ended-is-renewable'))
  with self.assertRaisesRegex(V.GateError,'specialist-lifecycle runtime profile/rules differ'):V.catalogue(self.root)
 def test_portfolio_market_drift(self):
  self.change('content/portfolio.json',lambda d:d['runtime']['markets']['eu-dublin'].update(jurisdiction='AU'))
  with self.assertRaisesRegex(V.GateError,'portfolio runtime profile/rules differ'):V.catalogue(self.root)
 def test_observation_threshold_drift(self):
  self.change('content/service-observation.json',lambda d:d['thresholds']['tb'].update(journeys=1))
  with self.assertRaisesRegex(V.GateError,'Observation threshold drift'):V.catalogue(self.root)
 def test_security_resource_dimension_drift(self):
  self.change('content/admission-security.json',lambda d:d['runtime']['defaults']['network'].update(capacityPps=1))
  with self.assertRaisesRegex(V.GateError,'admission-security runtime profile/rules differ'):V.catalogue(self.root)
 def test_acceptance_duplicate_alias_and_printed_ids_do_not_count(self):
  expected={'AC-SOC-001','AC-SOC-002'}
  self.assertEqual(V.acceptance_results('ok 1 - AC-SOC-001 first\nok 2 - AC-SOC-002 second\n',expected),dict.fromkeys(expected,'passed'))
  for tap,error in [('ok 1 - AC-SOC-001 first\nok 2 - AC-SOC-001 duplicate\n','Duplicate'),('ok 1 - AC-SOC-001a alias\nok 2 - AC-SOC-002 second\n','Invalid executed'),('# AC-SOC-001 mentioned\nok 1 - AC-SOC-002 second\n','differ from plan'),('not ok 1 - AC-SOC-001 first\nok 2 - AC-SOC-002 second\n','tests failed')]:
   with self.subTest(error=error),self.assertRaisesRegex(V.GateError,error):V.acceptance_results(tap,expected)
 def test_issue_exercise_sequence_drift(self):
  self.change('content/issue-exercises.json',lambda d:d['exercises'][0]['reference_commands'].pop())
  with self.assertRaisesRegex(V.GateError,'command sequence drift'):V.catalogue(self.root)
 def test_progression_false_source_completion(self):
  self.change('content/progression.json',lambda d:d['implementedSourceRows'].append(d['implementedSourceRows'][0]))
  with self.assertRaisesRegex(V.GateError,'partition differs'):V.catalogue(self.root)
 def test_site_goal_catalogue_drift(self):
  self.change('content/site-operations.json',lambda d:d['runtime']['GOALS'].pop())
  with self.assertRaisesRegex(V.GateError,'site-operations runtime profile/rules differ'):V.catalogue(self.root)
 def test_calling_goal_provenance_drift(self):
  self.change('content/calling-achievements.json',lambda d:d['sourceIds'].append('invented-source'))
  with self.assertRaisesRegex(V.GateError,'Missing calling-achievements runtime content provenance'):V.catalogue(self.root)
 def test_capability_level_catalogue_drift(self):
  self.change('content/capability-progression.json',lambda d:d['runtime']['implementedLevels'].pop())
  with self.assertRaisesRegex(V.GateError,'capability-progression runtime profile/rules differ'):V.catalogue(self.root)
 def test_product_evidence_expiry_drift(self):
  self.change('content/product-evidence.json',lambda d:d['runtime'].update(TTL=60000))
  with self.assertRaisesRegex(V.GateError,'product-evidence runtime profile/rules differ'):V.catalogue(self.root)
 def test_managed_usage_unit_drift(self):
  self.change('content/managed-operations.json',lambda d:d['runtime'].update(UNIT='seat'))
  with self.assertRaisesRegex(V.GateError,'managed-operations runtime profile/rules differ'):V.catalogue(self.root)
 def test_media_codec_catalogue_drift(self):
  self.change('content/media-negotiation.json',lambda d:d['runtime']['CODECS'].append('unimplemented-codec'))
  with self.assertRaisesRegex(V.GateError,'media-negotiation runtime profile/rules differ'):V.catalogue(self.root)
 def test_progression_dropped_original_predicate(self):
  self.change('content/progression.json',lambda d:d['records'][0]['original']['attributes'].pop('requirements'))
  with self.assertRaisesRegex(V.GateError,'original source changed'):V.catalogue(self.root)
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=pathlib.Path(self.tmp.name)
  for name in ['research','spec','content','maintenance','scripts','src','tests','artwork','site']:shutil.copytree(ROOT/name,self.root/name)
  self.copy_evidence_inputs()
  mapping=json.loads((ROOT/'research/source/series-of-calls-full-mapping.json').read_text())
  for name in {f['path'] for f in mapping['files']}|{r['source_file'] for r in mapping['rows']}|set(json.loads((ROOT/'spec/acceptance-plan.json').read_text())['inputs']):
   if name and (ROOT/name).is_file() and not (self.root/name).exists():
    (self.root/name).parent.mkdir(parents=True,exist_ok=True);shutil.copy(ROOT/name,self.root/name)
 def copy_evidence_inputs(self):
  """Copy only evidence read by verify.py; skip unrelated browser captures/traces."""
  destination=self.root/'evidence';destination.mkdir()
  def copy(path):
   source=ROOT/path;target=destination/pathlib.Path(path).relative_to('evidence')
   target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
  for path in ['evidence/acceptance.json','evidence/browser.json']:copy(path)
  register=json.loads((ROOT/'maintenance/upstream/register.json').read_text())
  for collection in ['commits','files','fileVersions']:
   for item in register[collection]:
    if item['status']!='verified':continue
    for receipt_path in item['evidence']:
     copy(receipt_path);receipt=json.loads((ROOT/receipt_path).read_text())
     for suite in receipt['suites']:copy(suite['log']['path'])
 def tearDown(self):self.tmp.cleanup()
 def change(self,path,fn):
  p=self.root/path;d=json.loads(p.read_text());fn(d);p.write_text(json.dumps(d))
 def upstream_evidence(self,register,implementation='src/game/54-business.js'):
  item=register['commits'][0];test_path='tests/service-observation.test.js'
  plan=json.loads((self.root/'spec/acceptance-plan.json').read_text());run=subprocess.run(['node','--test','--test-isolation=none','--test-reporter=tap',test_path],cwd=self.root,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,check=True)
  receipt_path=V.upstream_receipt_path('commits',item);log_path='evidence/upstream-adoption/logs/commit-'+item['sha']+'--service-observation.tap';log=(self.root/log_path);log.parent.mkdir(parents=True,exist_ok=True);log.write_text(run.stdout)
  receipt={'schemaVersion':1,'subject':{'collection':'commits','sha':item['sha']},'implementation':[implementation],'inputs':[{'path':implementation,'sha256':V.sha(self.root/implementation)},{'path':test_path,'sha256':V.sha(self.root/test_path)}],'suites':[{'path':test_path,'ids':plan['suites'][test_path],'log':{'path':log_path,'sha256':V.sha(log)}}]}
  destination=self.root/receipt_path;destination.parent.mkdir(parents=True,exist_ok=True);destination.write_text(json.dumps(receipt))
  item.update(status='verified',evidence=[receipt_path])
  return receipt
 def test_source_tamper(self):
  p=self.root/'research/source/series-of-calls-full-mapping.json';p.write_text(p.read_text()+' ')
  with self.assertRaisesRegex(V.GateError,'Preserved source changed'):V.source(self.root)
 def test_deleted_mapping_and_requirement(self):
  self.change('spec/generated/source-items.json',lambda d:d.pop())
  self.change('spec/generated/requirements.json',lambda d:d.pop())
  with self.assertRaises(V.GateError):V.coverage(self.root)
 def test_deleted_evidence(self):
  self.change('evidence/acceptance.json',lambda d:d['tests'].pop('AC-SOC-001'))
  with self.assertRaisesRegex(V.GateError,'Missing or failing'):V.evidence(self.root)
 def test_deleted_evidence_input(self):
  self.change('evidence/acceptance.json',lambda d:d['inputs'].pop('src/game/55-communications.js'))
  with self.assertRaisesRegex(V.GateError,'input inventory'):V.evidence(self.root)
 def test_false_completion(self):
  self.change('spec/generated/requirements.json',lambda d:next(r for r in d if not r['implementation']).update(status='complete'))
  with self.assertRaisesRegex(V.GateError,'lacks implementation'):V.coverage(self.root)
 def test_flavour_cannot_complete_a_source_mechanic(self):
  self.change('spec/generated/requirements.json',lambda d:next(r for r in d if 'BEH-SOC-071' in r.get('behaviours',[])).update(status='complete'))
  with self.assertRaisesRegex(V.GateError,'Generated source coverage differs'):V.coverage(self.root)
 def test_invalid_relationship(self):
  self.change('content/contracts.json',lambda d:d['compatibility'][0].update(to='missing'))
  with self.assertRaisesRegex(V.GateError,'Unresolved compatibility'):V.catalogue(self.root)
 def test_wrong_dependency_unit(self):
  self.change('content/contracts.json',lambda d:d['products'][2]['dependencies'][0].update(unit='Mbps'))
  with self.assertRaisesRegex(V.GateError,'unit mismatch'):V.catalogue(self.root)
 def test_catalogue_drift(self):
  self.change('content/contracts.json',lambda d:d['products'][0]['configuration'].update(enabled=False))
  with self.assertRaisesRegex(V.GateError,'differs from runtime'):V.catalogue(self.root)
 def test_mapping_audit_omission(self):
  self.change('spec/audit/mapping-review.json',lambda d:d['records'].pop())
  with self.assertRaisesRegex(V.GateError,'Mapping audit'):V.mapping(self.root)
 def test_mapping_clause_loss(self):
  self.change('spec/audit/mapping-review.json',lambda d:d['clauses'].pop())
  with self.assertRaisesRegex(V.GateError,'Mapping audit'):V.mapping(self.root)
 def test_narrative_false_source(self):
  self.change('content/narrative.json',lambda d:d['entries'][0].update(sourceRecordSha256='invented'))
  with self.assertRaisesRegex(V.GateError,'Narrative source hash'):V.mapping(self.root)
 def test_offer_dimension_drift(self):
  self.change('content/business.json',lambda d:d['offers']['access'].update(unit='seat'))
  with self.assertRaisesRegex(V.GateError,'differs from runtime'):V.catalogue(self.root)
 def test_integration_feature_drift(self):
  self.change('content/operations.json',lambda d:d['features']['connect'].append('embedded-client'))
  with self.assertRaisesRegex(V.GateError,'matrix differs'):V.catalogue(self.root)
 def test_transport_profile_parity(self):
  self.change('content/transport.json',lambda d:d['runtime']['profiles']['voice'].update(kbps=161))
  with self.assertRaisesRegex(V.GateError,'transport runtime profile/rules differ'):V.catalogue(self.root)
 def test_boundary_rule_parity(self):
  self.change('content/boundaries.json',lambda d:d['profiles']['AU'].update(fictionalRule='universal-approval'))
  with self.assertRaisesRegex(V.GateError,'Boundary profile description/rule/provenance drift'):V.catalogue(self.root)
 def test_campaign_track_parity(self):
  self.change('content/campaign.json',lambda d:d['tracks'][0]['requiredResources'].append('invented-service'))
  with self.assertRaisesRegex(V.GateError,'Campaign track rule drift'):V.catalogue(self.root)
 def test_product_family_parity(self):
  self.change('content/products.json',lambda d:d['runtime']['families']['microsoft:meetings-rooms']['features']['protected-meeting-mode'].append('unsupported-resource'))
  with self.assertRaisesRegex(V.GateError,'products runtime profile/rules differ'):V.catalogue(self.root)
 def test_outcome_policy_parity(self):
  self.change('content/outcomes.json',lambda d:d['runtime']['defaults'].update(maxAttempts=99))
  with self.assertRaisesRegex(V.GateError,'outcomes runtime profile/rules differ'):V.catalogue(self.root)
 def test_channel_profile_parity(self):
  self.change('content/channels.json',lambda d:d['runtime']['defaults']['chatterleaf'].update(responseWindowMinutes=999))
  with self.assertRaisesRegex(V.GateError,'channels runtime profile/rules differ'):V.catalogue(self.root)
 def test_unresolved_behaviour_source(self):
  self.change('spec/implementation.json',lambda d:d['behaviours'][0].update(sources=['invented']))
  with self.assertRaisesRegex(V.GateError,'lost provenance'):V.evidence(self.root)
 def test_upstream_item_disappeared(self):
  self.change('maintenance/upstream/register.json',lambda d:d['commits'].pop())
  with self.assertRaisesRegex(V.GateError,'disappeared'):V.upstream(self.root,dt.date(2026,11,3))
 def test_upstream_coverage_detects_omitted_generated_commit_source(self):
  obligations=json.loads((self.root/'spec/generated/upstream-obligations.json').read_text());register=json.loads((self.root/'maintenance/upstream/register.json').read_text());sha=register['commits'][0]['sha']
  self.assertIn('UPSTREAM-COMMIT:'+sha,{row['sourceId'] for row in obligations})
  self.change('maintenance/upstream/register.json',lambda d:d['commits'].pop(0))
  with self.assertRaisesRegex(V.GateError,'Generated source coverage differs'):V.coverage(self.root)
 def test_upstream_generator_accepts_commit_message_when_subject_field_is_absent(self):
  message='observer supplied commit message for subjectless record'
  def subjectless(d):
   commit=d['commits'][0];commit.pop('subject',None);commit['commit']={'message':message}
  self.change('maintenance/upstream/register.json',subjectless)
  generator_spec=importlib.util.spec_from_file_location('generator_subjectless',self.root/'scripts/generate-spec.py');generator=importlib.util.module_from_spec(generator_spec);generator_spec.loader.exec_module(generator);generator.ROOT=self.root;generator.generate()
  obligations=json.loads((self.root/'spec/generated/upstream-obligations.json').read_text());row=next(x for x in obligations if x['commit']==json.loads((self.root/'maintenance/upstream/register.json').read_text())['commits'][0]['sha'])
  self.assertEqual(row['subject'],message)
 def test_upstream_verified_row_rejects_truthy_unstructured_evidence(self):
  def forge(d):d['commits'][0].update(status='verified',evidence=['looks like proof'])
  self.change('maintenance/upstream/register.json',forge)
  with self.assertRaisesRegex(V.GateError,'subject-scoped receipt'):V.upstream(self.root,dt.date(2026,11,3))
 def test_upstream_verified_row_requires_hash_bound_test_receipt(self):
  def forge(d):
   item=d['commits'][0];proof=self.upstream_evidence(d);proof['inputs'][0]['sha256']='0'*64;(self.root/V.upstream_receipt_path('commits',item)).write_text(json.dumps(proof))
  self.change('maintenance/upstream/register.json',forge)
  with self.assertRaisesRegex(V.GateError,'input missing or hash mismatch'):V.upstream(self.root,dt.date(2026,11,3))
 def test_upstream_verified_row_rejects_deleted_scoped_receipt(self):
  def forge(d):
   item=d['commits'][0];self.upstream_evidence(d);(self.root/V.upstream_receipt_path('commits',item)).unlink()
  self.change('maintenance/upstream/register.json',forge)
  with self.assertRaisesRegex(V.GateError,'Missing upstream adoption receipt'):V.upstream(self.root,dt.date(2026,11,3))
 def test_upstream_verified_row_rejects_forged_tap_result(self):
  def forge(d):
   item=d['commits'][0];self.upstream_evidence(d);receipt_path=self.root/V.upstream_receipt_path('commits',item);receipt=json.loads(receipt_path.read_text());log_path=self.root/receipt['suites'][0]['log']['path'];log=log_path.read_text().replace('ok 1 - AC-SOC-177','not ok 1 - AC-SOC-177',1);log_path.write_text(log);receipt['suites'][0]['log']['sha256']=V.sha(log_path);receipt_path.write_text(json.dumps(receipt))
  self.change('maintenance/upstream/register.json',forge)
  with self.assertRaisesRegex(V.GateError,'Acceptance tests failed'):V.upstream(self.root,dt.date(2026,11,3))
 def test_upstream_verified_receipt_supports_documentation_implementation(self):
  def forge(d):self.upstream_evidence(d,'README.md')
  self.change('maintenance/upstream/register.json',forge)
  V.upstream(self.root,dt.date(2026,11,3))
 def test_upstream_verified_receipt_rejects_malformed_utf8_tap_log(self):
  def forge(d):
   item=d['commits'][0];self.upstream_evidence(d);receipt_path=self.root/V.upstream_receipt_path('commits',item);receipt=json.loads(receipt_path.read_text());log=self.root/receipt['suites'][0]['log']['path'];log.write_bytes(bytes([255]));receipt['suites'][0]['log']['sha256']=V.sha(log);receipt_path.write_text(json.dumps(receipt))
  self.change('maintenance/upstream/register.json',forge)
  with self.assertRaisesRegex(V.GateError,'TAP log is not UTF-8'):V.upstream(self.root,dt.date(2026,11,3))
 def test_upstream_verified_row_requires_current_tested_file_hashes(self):
  def forge(d):self.upstream_evidence(d)
  self.change('maintenance/upstream/register.json',forge)
  path=self.root/'src/game/54-business.js';path.write_text(path.read_text()+'\\n')
  with self.assertRaisesRegex(V.GateError,'input missing or hash mismatch'):V.upstream(self.root,dt.date(2026,11,3))
 def test_upstream_verified_row_reexecutes_named_acceptance_suite(self):
  def forge(d):
   self.upstream_evidence(d)
   report=self.root/'evidence/acceptance.json';report.write_text(json.dumps({'regenerated':True}))
  self.change('maintenance/upstream/register.json',forge)
  V.upstream(self.root,dt.date(2026,11,3))
 def test_upstream_without_verified_rows_does_not_require_global_acceptance_report(self):
  (self.root/'evidence/acceptance.json').unlink()
  V.upstream(self.root,dt.date(2026,11,3))
 def test_stale_successful_check(self):
  self.change('maintenance/upstream/register.json',lambda d:d.update(lastSuccessfulCheck='2026-01-01'))
  with self.assertRaisesRegex(V.GateError,'older than 14'):V.upstream(self.root,dt.date(2026,11,3),True)
 def test_expired_jurisdiction_review(self):
  ref=json.loads((self.root/'research/generated/references.json').read_text())[0]['id']
  self.change('research/generated/references.json',lambda d:d[0].update(activeJurisdictionClaim=True))
  (self.root/'research/reviews.json').write_text(json.dumps([{'id':'REV-1','reference':ref,'acceptedAt':'2026-01-01'}]))
  with self.assertRaisesRegex(V.GateError,'expired'):V.freshness(self.root,dt.date(2026,11,3))

class ReleaseRequirementGate(unittest.TestCase):
 """Exercise the release decision with real, bounded acceptance evidence.

 Static/source, upstream and freshness gates have their own mutation cases above.
 Only those orthogonal gates are patched here; release(), evidence(), the recorder
 and Node execution remain real. This fixture never claims application coverage.
 """
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory(prefix='soc-release-requirement-')
  self.addCleanup(self.tmp.cleanup);self.root=pathlib.Path(self.tmp.name)
  for directory in ['scripts','src','tests','evidence','spec/generated','maintenance']:
   (self.root/directory).mkdir(parents=True,exist_ok=True)
  for name in ['verify.py','record-evidence.py']:
   shutil.copy2(ROOT/'scripts'/name,self.root/'scripts'/name)
  (self.root/'src/fixture.js').write_text('module.exports = 7;\n')
  (self.root/'tests/fixture.test.js').write_text("""const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
test('AC-SOC-001 synthetic release fixture', () => {
  fs.appendFileSync('evidence/executions.txt', 'executed\\n');
  assert.equal(require('../src/fixture.js'), 7);
  assert.equal(fs.existsSync('evidence/fail-fixture'), false);
});
""")
  self.write('spec/generated/source-items.json',[{'id':'fixture-source'}])
  self.write('spec/generated/requirements.json',[{'id':'fixture-requirement','sources':['fixture-source']}])
  self.write('spec/implementation.json',{'behaviours':[{'id':'fixture-behaviour','sources':['fixture-source'],
   'implementation':['src/fixture.js'],'testIds':['AC-SOC-001']}]})
  self.write('spec/acceptance-plan.json',{'suites':{'tests/fixture.test.js':['AC-SOC-001']},
   'inputs':['src/fixture.js','tests/fixture.test.js','scripts/verify.py','scripts/record-evidence.py']})
  self.write('spec/dispositions.json',{})
  self.write('maintenance/readiness.json',{})
  recorded=subprocess.run(['python3',str(self.root/'scripts/record-evidence.py')],cwd=self.root,
   capture_output=True,text=True,check=True)
  self.assertIn('failures=0',recorded.stdout)
  report=json.loads((self.root/'evidence/acceptance.json').read_text())
  self.assertEqual(report['tests'],{'AC-SOC-001':'passed'})
  self.assertEqual(report['command'][-1],'tests/fixture.test.js')
  self.assertEqual(self.executions(),1)
 def write(self,path,value):
  (self.root/path).write_text(json.dumps(value))
 def executions(self):
  return len((self.root/'evidence/executions.txt').read_text().splitlines())
 def assert_release_refusal(self,message,reaches_history=True):
  now=dt.date(2026,11,3);calls=mock.Mock()
  with ExitStack() as patches:
   for name in ['source','coverage','mapping','catalogue','upstream','freshness']:
    stub=patches.enter_context(mock.patch.object(V,name))
    calls.attach_mock(stub,name)
   # Upstream is strictly after the real evidence replay in the production gate.
   V.upstream.side_effect=lambda *args:self.assertEqual(self.executions(),2)
   with self.assertRaisesRegex(V.GateError,message):V.release(self.root,now)
  expected=[mock.call.source(self.root),mock.call.coverage(self.root),
   mock.call.mapping(self.root),mock.call.catalogue(self.root)]
  if reaches_history:expected += [mock.call.upstream(self.root,now,True),mock.call.freshness(self.root,now,True)]
  self.assertEqual(calls.mock_calls,expected)
  self.assertEqual(self.executions(),2,'release must execute the real tiny acceptance suite again')
 def test_pending_release_cannot_pass(self):
  self.assert_release_refusal('^Full release blocked: requirements remain pending$')
 def test_resolved_requirement_reaches_the_distinct_readiness_gate(self):
  self.write('spec/dispositions.json',{'fixture-requirement':{'status':'verified',
   'behaviours':['fixture-behaviour'],'acceptance':['AC-SOC-001']}})
  self.assert_release_refusal('^Repository, history, browser, protection or maintenance readiness incomplete$')
 def test_failing_real_acceptance_is_not_mistaken_for_pending_requirements(self):
  (self.root/'evidence/fail-fixture').touch()
  self.assert_release_refusal('^Current behavioural tests fail:',reaches_history=False)
if __name__=='__main__':unittest.main()
