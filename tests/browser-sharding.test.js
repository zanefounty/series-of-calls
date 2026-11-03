const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const runner=require('../scripts/browser-campaigns'),{aggregateReports,verifyArtifacts}=require('../scripts/aggregate-browser-campaigns');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
function reports(count=6,journey='campaign'){
 const inputs={'package-lock.json':'a'.repeat(64),'scripts/browser-campaigns.js':'b'.repeat(64)},all=runner.caseMatrix();
 return Array.from({length:count},(_,n)=>{
  const shard={index:n+1,count},cases=runner.shardCases(all,shard);
  return {status:'shard-passed',partial:true,shard,profileCount:48,profileMatrix:runner.matrix(),plannedCaseKeys:cases.map(c=>c.key),journey,scope:'Bounded synthetic browser fixture',node:'v24.22.2',browser:{engine:'chromium',version:'141.0.7390.37',playwright:'1.56.0',playwrightLockfile:'1.56.0'},versions:{source:'0.1.0-preview.1',lockfile:'0.1.0-preview.1'},inputs,inputSha256:hash(JSON.stringify(inputs)),lockfileSha256:inputs['package-lock.json'],artifact:{sha256:'c'.repeat(64),files:47,version:'0.1.0-preview.1'},maxRuntimeMs:1800000,caseRuntimeLimitMs:journey==='campaign'?240000:60000,elapsedMs:1000,sourceDrift:[],errors:[],results:cases.map(c=>{
   const tracks=['smb','enterprise','government','defence'].slice(0,['smb','enterprise','government','defence'].indexOf(c.profile.scenario)+1);
   return {...c,status:'passed',errors:[],consoleErrors:[],trace:'/other-root/'+c.key+'.trace.zip',screenshot:'/other-root/'+c.key+'.png',outcomes:journey==='campaign'?{tracks,checkpoints:tracks.flatMap(track=>['window','window','incident','window','orders-pending','orders-active','window','award','renewal-due','renewed'].map(kind=>({track,kind,clock:1,passed:true})))}:{referencePhase:'resolved',referenceAssessment:{passed:true},failurePhase:'failed',failureAssessment:{passed:false},recoveryPhase:'resolved',recoveryAssessment:{passed:true}}};
  })};
 });
}
test('deterministic uneven shards preserve every full-matrix key once and retain scenario/profile/viewport assignments',()=>{
 const all=runner.caseMatrix(),parts=Array.from({length:5},(_,index)=>runner.shardCases(all,{index:index+1,count:5}));
 assert.equal(all.length,144);assert.equal(new Set(parts.flat().map(c=>c.key)).size,144);assert.equal(parts.flat().length,144);
 for(let i=0;i<5;i++)assert.deepEqual(parts[i],all.filter((_,index)=>index%5===i));
 assert.deepEqual(runner.parseArgs(['--browser','firefox','--journey','campaign','--shard','2/6']).shard,{index:2,count:6});
 for(const value of ['0/6','7/6','1/0','1/145','-1/2','1.0/2','1/2x'])assert.throws(()=>runner.parseArgs(['--shard',value]),/SHARD_MUST_BE/);
});
test('one successful shard is partial evidence and cannot report full passed',()=>{
 const shard=reports()[0];assert.equal(runner.classifyReport(shard),'shard-passed');assert.notEqual(runner.classifyReport(shard),'passed');
 const missing=structuredClone(shard);missing.results.pop();assert.equal(runner.classifyReport(missing),'failed');
 const wrong=structuredClone(shard);wrong.results[0].key='invented';assert.equal(runner.classifyReport(wrong),'failed');
});
test('aggregator accepts exactly 144 unique matching cases for each journey, including uneven partitions',()=>{
 for(const count of [1,5,6,144])for(const journey of ['compact','campaign']){
  const result=aggregateReports(reports(count,journey));assert.equal(result.status,'passed');assert.equal(result.caseCount,144);assert.deepEqual(result.results.map(r=>r.key),runner.caseMatrix().map(c=>c.key));
 }
});
test('aggregator rejects missing shards, missing cases, duplicated shards and duplicated or misassigned cases',()=>{
 const base=reports();assert.throws(()=>aggregateReports(base.slice(1)),/MISSING_SHARD/);
 const mutations=[x=>x[1]=structuredClone(x[0]),x=>x[0].results.pop(),x=>x[0].results[1]=structuredClone(x[0].results[0]),x=>x[0].plannedCaseKeys.pop(),x=>x[0].results[0].profile.mode='sandbox'];
 for(const mutate of mutations){const x=structuredClone(base);mutate(x);assert.throws(()=>aggregateReports(x));}
});
test('aggregator rejects cross-input, cross-artifact, browser, journey, lock and version mixtures',()=>{
 const mutations=[x=>{x[1].inputs['scripts/browser-campaigns.js']='e'.repeat(64);x[1].inputSha256=hash(JSON.stringify(x[1].inputs));},x=>x[1].inputSha256='e'.repeat(64),x=>x[1].artifact.sha256='d'.repeat(64),x=>x[1].browser.engine='webkit',x=>x[1].browser.playwright='1.65.0',x=>x[1].journey='compact',x=>x[1].lockfileSha256='f'.repeat(64),x=>x[1].versions.source='different'];
 for(const mutate of mutations){const x=reports();mutate(x);assert.throws(()=>aggregateReports(x));}
});
test('aggregator fails closed on failed cases, errors, drift, weakened deadlines and missing campaign checkpoints',()=>{
 const mutations=[x=>x[0].status='failed',x=>x[0].results[0].status='failed',x=>x[0].results[0].errors.push('pageerror'),x=>x[0].results[0].consoleErrors.push('console:error'),x=>x[0].sourceDrift.push({file:'src/runtime.js'}),x=>x[0].errors.push({stage:'runtime-budget'}),x=>x[0].caseRuntimeLimitMs=999999,x=>x[0].maxRuntimeMs=1800001,x=>x[0].results[0].outcomes.checkpoints.pop(),x=>x[0].results[0].outcomes.checkpoints[2].kind='window'];
 for(const mutate of mutations){const x=reports();mutate(x);assert.throws(()=>aggregateReports(x));}
});
test('artifact verification uses receipt-relative files across container roots and rejects missing or modified artifacts',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'soc-shard-artifacts-'));
 try{
  const report=reports(144)[0],manifest={artifactDirectory:'/container/build',files:[['index.html','a'.repeat(64)]]},bytes=JSON.stringify(manifest)+'\n';
  fs.writeFileSync(path.join(directory,'artifact-manifest.json'),bytes);report.artifact={files:1,sha256:hash(JSON.stringify(manifest.files)),manifestSha256:hash(bytes)};
  const row=report.results[0];fs.writeFileSync(path.join(directory,row.key+'.trace.zip'),'retained trace fixture');fs.writeFileSync(path.join(directory,row.key+'.png'),'retained screenshot fixture');
  assert.equal(verifyArtifacts(report,path.join(directory,'report.json')).length,2);
  fs.unlinkSync(path.join(directory,row.key+'.png'));assert.throws(()=>verifyArtifacts(report,path.join(directory,'report.json')),/CASE_ARTIFACT_MISSING/);
  fs.writeFileSync(path.join(directory,'artifact-manifest.json'),bytes+' ');assert.throws(()=>verifyArtifacts(report,path.join(directory,'report.json')),/MANIFEST_HASH/);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
