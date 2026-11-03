import datetime,importlib.util,json,pathlib,shutil,tempfile,unittest
from unittest.mock import patch
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('accept_observation',ROOT/'scripts/accept-observation.py');M=importlib.util.module_from_spec(spec);spec.loader.exec_module(M)
class Observations(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=pathlib.Path(self.temp.name)/'root';self.artifact=pathlib.Path(self.temp.name)/'artifact';self.artifact.mkdir()
  for name in ['maintenance','research']:shutil.copytree(ROOT/name,self.root/name)
  observed_now=datetime.datetime.now(datetime.timezone.utc)
  class FrozenClock(datetime.datetime):
   @classmethod
   def now(cls,tz=None):return observed_now.astimezone(tz) if tz else observed_now.replace(tzinfo=None)
  clock_patch=patch.object(M.datetime,'datetime',FrozenClock);clock_patch.start();self.addCleanup(clock_patch.stop)
  self.now=observed_now.isoformat()
 def tearDown(self):self.temp.cleanup()
 def write(self,path,value):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(value))
 def clear_artifact(self):
  for child in self.artifact.iterdir():shutil.rmtree(child) if child.is_dir() else child.unlink()
 def references(self,unavailable=False):
  refs=json.loads((self.root/'research/generated/references.json').read_text())
  rows=[{'id':r['id'],'url':r['url'],'observedAt':self.now,'acceptedReview':False,'status':'unavailable' if unavailable else 200,'contentHash':'a'*64,'error':'synthetic test outage'} for r in refs]
  report={'lastAttempt':self.now,'lastSuccessfulCheck':None if unavailable else self.now,'observations':rows}
  self.write(self.artifact/'reference-check.json',report);self.write(self.artifact/'reference-history/new.json',rows);return report
 def upstream(self):
  directory=self.root/'maintenance/upstream'
  for name in ['register','commits','tree','comparison','releases']:shutil.copy(directory/(name+'.json'),self.artifact/(name+'.json'))
  reg=json.loads((directory/'register.json').read_text());history={'observedAt':self.now,'base':reg.get('mappingBaseline'),'head':reg['latestObserved'],'commits':json.loads((directory/'commits.json').read_text()),'files':json.loads((directory/'tree.json').read_text())['tree'],'changes':json.loads((directory/'comparison.json').read_text())['files'],'releases':json.loads((directory/'releases.json').read_text())}
  reg.update(lastSuccessfulCheck=self.now,latestReleaseCheck=self.now,fullHistoryAvailable=True);reg.setdefault('observations',[]).append('maintenance/upstream/history/new.json')
  self.write(self.artifact/'register.json',reg);self.write(self.artifact/'history/new.json',history);return reg
 def test_iso_utc_plus_history_filenames_are_valid(self):
  report=self.references(); old=self.artifact/"reference-history/new.json"; name="reference-history/"+self.now.replace(":","-")+".json"; target=self.artifact/name; target.parent.mkdir(parents=True,exist_ok=True); old.rename(target); self.assertTrue(M.validate(self.root,self.artifact,"references"))
  self.clear_artifact();reg=self.upstream(); old=self.artifact/"history/new.json"; name="history/"+self.now.replace(":","-")+"-"+reg["latestObserved"]+".json"; target=self.artifact/name; target.parent.mkdir(parents=True,exist_ok=True); old.rename(target); reg["observations"][-1]="maintenance/upstream/"+name; self.write(self.artifact/"register.json",reg); self.assertTrue(M.validate(self.root,self.artifact,"upstream"))
 def test_artifact_symlinks_cannot_traverse_outside_root(self):
  outside=pathlib.Path(self.temp.name)/"outside.json";outside.write_text("{}")
  self.references(); link=self.artifact/"reference-history/escaped.json";link.symlink_to(outside)
  with self.assertRaisesRegex(ValueError,"Artifact symlink is forbidden"):M.validate(self.root,self.artifact,"references")
  link.unlink();self.clear_artifact();self.upstream();link=self.artifact/"history/escaped.json";link.symlink_to(outside)
  with self.assertRaisesRegex(ValueError,"Artifact symlink is forbidden"):M.validate(self.root,self.artifact,"upstream")
 def test_observation_rejects_future_or_expired_timestamp(self):
  for offset in [datetime.timedelta(seconds=1),-datetime.timedelta(days=2,seconds=1)]:
   report=self.references();report['lastAttempt']=(datetime.datetime.fromisoformat(self.now)+offset).isoformat();self.write(self.artifact/'reference-check.json',report)
   with self.subTest(offset=offset),self.assertRaisesRegex(ValueError,'stale or from the future'):M.validate(self.root,self.artifact,'references')
 def test_reference_observation_and_partial_failure_are_recordable(self):
  self.references();self.assertTrue(M.validate(self.root,self.artifact,'references'))
  self.references(True);self.assertTrue(M.validate(self.root,self.artifact,'references'))
 def test_unavailable_links_cannot_advance_success_clock(self):
  report=self.references(True);report['lastSuccessfulCheck']=self.now;self.write(self.artifact/'reference-check.json',report)
  with self.assertRaisesRegex(ValueError,'Failed checks'):M.validate(self.root,self.artifact,'references')
 def test_observation_cannot_accept_claims(self):
  report=self.references();report['observations'][0]['acceptedReview']=True;self.write(self.artifact/'reference-check.json',report)
  with self.assertRaisesRegex(ValueError,'cannot accept'):M.validate(self.root,self.artifact,'references')
 def test_observation_cannot_modify_old_dispositions(self):
  reg=self.upstream();self.assertTrue(M.validate(self.root,self.artifact,'upstream'));reg['commits'][0]['status']='verified';self.write(self.artifact/'register.json',reg)
  with self.assertRaisesRegex(ValueError,'existing disposition'):M.validate(self.root,self.artifact,'upstream')
 def test_observation_cannot_drop_history_or_include_code(self):
  reg=self.upstream();reg['fileVersions'].pop();self.write(self.artifact/'register.json',reg)
  with self.assertRaisesRegex(ValueError,'accounting'):M.validate(self.root,self.artifact,'upstream')
  self.upstream();(self.artifact/'payload.py').write_text('raise Exception()')
  with self.assertRaisesRegex(ValueError,'Unsupported observation path'):M.validate(self.root,self.artifact,'upstream')
if __name__=='__main__':unittest.main()
