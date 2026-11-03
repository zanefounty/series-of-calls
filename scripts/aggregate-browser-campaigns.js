#!/usr/bin/env node
'use strict';
// A shard is partial evidence. Only the exact, matching, complete union can pass.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {matrix,caseMatrix,shardCases,sourceManifest}=require('./browser-campaigns');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const canonical=value=>JSON.stringify(value);
const need=(value,code)=>{if(!value)throw new Error(code);};
function aggregateReports(reports){
 need(Array.isArray(reports)&&reports.length>0&&reports.length<=144,'SHARD_REPORTS_REQUIRED');
 const first=reports[0],count=first.shard?.count,all=caseMatrix(),seen=new Set(),indices=new Set(),rows=[];
 need(Number.isInteger(count)&&count>=1&&count<=144&&reports.length===count,'MISSING_SHARD_REPORT');
 need(['compact','campaign'].includes(first.journey),'INVALID_JOURNEY');
 need(['chromium','firefox','webkit'].includes(first.browser?.engine),'INVALID_BROWSER');
 for(const report of reports){
  need(report.status==='shard-passed'&&report.partial===true,'SHARD_NOT_PASSED');
  need(Array.isArray(report.errors)&&report.errors.length===0&&Array.isArray(report.sourceDrift)&&report.sourceDrift.length===0,'SHARD_ERRORS_OR_DRIFT');
  need(report.shard?.count===count&&Number.isInteger(report.shard.index)&&report.shard.index>=1&&report.shard.index<=count&&!indices.has(report.shard.index),'DUPLICATE_OR_INVALID_SHARD');indices.add(report.shard.index);
  need(report.profileCount===48&&canonical(report.profileMatrix)===canonical(matrix()),'INCOMPLETE_PROFILE_MATRIX');
  need(report.journey===first.journey&&canonical(report.browser)===canonical(first.browser)&&report.node===first.node&&report.scope===first.scope,'MIXED_BROWSER_OR_JOURNEY');
  need(report.browser.version&&report.browser.playwright===report.browser.playwrightLockfile,'LOCKED_BROWSER_REQUIRED');
  need(report.versions?.source===report.versions?.lockfile&&canonical(report.versions)===canonical(first.versions),'APPLICATION_VERSION_MISMATCH');
  need(report.inputs&&report.inputSha256===sha(canonical(report.inputs))&&report.inputSha256===first.inputSha256&&canonical(report.inputs)===canonical(first.inputs),'MIXED_OR_INVALID_INPUTS');
  need(report.lockfileSha256===first.lockfileSha256&&report.lockfileSha256===report.inputs['package-lock.json'],'LOCKFILE_HASH_MISMATCH');
  need(report.artifact?.sha256===first.artifact?.sha256&&report.artifact?.files===first.artifact?.files&&report.artifact?.version===first.artifact?.version,'MIXED_ARTIFACTS');
  need(Number.isFinite(report.maxRuntimeMs)&&report.maxRuntimeMs>=60000&&report.maxRuntimeMs<=1800000,'INVALID_SHARD_DEADLINE');
  need(report.caseRuntimeLimitMs===(report.journey==='campaign'?240000:60000),'INVALID_CASE_DEADLINE');
  need(Number.isFinite(report.elapsedMs)&&report.elapsedMs>=0,'INVALID_ELAPSED_TIME');
  const expected=shardCases(all,report.shard),keys=expected.map(row=>row.key);
  need(canonical(report.plannedCaseKeys)===canonical(keys),'SHARD_ASSIGNMENT_MISMATCH');
  need(Array.isArray(report.results)&&report.results.length===expected.length,'MISSING_CASE');
  for(let i=0;i<expected.length;i++){
   const row=report.results[i],want=expected[i];
   need(row.key===want.key&&!seen.has(row.key),'DUPLICATE_OR_MISASSIGNED_CASE');seen.add(row.key);
   need(canonical(row.profile)===canonical(want.profile)&&canonical(row.viewport)===canonical(want.viewport),'CASE_PROFILE_MISMATCH');
   need(row.status==='passed'&&Array.isArray(row.errors)&&row.errors.length===0&&Array.isArray(row.consoleErrors)&&row.consoleErrors.length===0,'CASE_NOT_PASSED');
   need(typeof row.trace==='string'&&path.basename(row.trace)===row.key+'.trace.zip'&&typeof row.screenshot==='string'&&path.basename(row.screenshot)===row.key+'.png','CASE_ARTIFACT_REFERENCE_REQUIRED');
   if(report.journey==='campaign'){
    const tracks=['smb','enterprise','government','defence'].slice(0,['smb','enterprise','government','defence'].indexOf(row.profile.scenario)+1);
    const expectedCheckpoints=tracks.flatMap(track=>['window','window','incident','window','orders-pending','orders-active','window','award','renewal-due','renewed'].map(kind=>[track,kind]));
    need(canonical(row.outcomes?.tracks)===canonical(tracks)&&canonical(row.outcomes?.checkpoints?.map(c=>[c.track,c.kind]))===canonical(expectedCheckpoints)&&row.outcomes.checkpoints.every(c=>c.passed===true&&Number.isSafeInteger(c.clock)&&c.clock>=0),'CAMPAIGN_CHECKPOINTS_REQUIRED');
   }else need(row.outcomes?.referencePhase==='resolved'&&row.outcomes?.referenceAssessment?.passed===true&&row.outcomes?.failurePhase!=='resolved'&&row.outcomes?.failureAssessment?.passed===false&&row.outcomes?.recoveryPhase==='resolved'&&row.outcomes?.recoveryAssessment?.passed===true,'COMPACT_OUTCOMES_REQUIRED');
   rows.push(row);
  }
 }
 need(indices.size===count&&seen.size===144&&all.every(row=>seen.has(row.key)),'MISSING_CASE');
 rows.sort((a,b)=>all.findIndex(x=>x.key===a.key)-all.findIndex(x=>x.key===b.key));
 return {schemaVersion:1,status:'passed',scope:first.scope,journey:first.journey,profileCount:48,profileMatrix:matrix(),caseCount:144,shards:count,browser:first.browser,versions:first.versions,inputSha256:first.inputSha256,inputs:first.inputs,lockfileSha256:first.lockfileSha256,artifactSha256:first.artifact.sha256,sourceDrift:[],results:rows};
}
function verifyArtifacts(report,reportFile){
 const directory=path.dirname(reportFile),manifestFile=path.join(directory,'artifact-manifest.json');
 need(fs.existsSync(manifestFile),'ARTIFACT_MANIFEST_MISSING');
 const bytes=fs.readFileSync(manifestFile),manifest=JSON.parse(bytes);
 need(sha(bytes)===report.artifact.manifestSha256,'ARTIFACT_MANIFEST_HASH_MISMATCH');
 need(Array.isArray(manifest.files)&&manifest.files.length===report.artifact.files&&sha(canonical(manifest.files))===report.artifact.sha256,'ARTIFACT_TREE_HASH_MISMATCH');
 const artifacts=[];
 for(const row of report.results)for(const name of [row.key+'.trace.zip',row.key+'.png']){
  const file=path.join(directory,name);need(fs.existsSync(file)&&fs.statSync(file).isFile()&&fs.statSync(file).size>0,'CASE_ARTIFACT_MISSING:'+name);
  artifacts.push({file,sha256:sha(fs.readFileSync(file)),bytes:fs.statSync(file).size});
 }
 return artifacts;
}
function main(argv=process.argv.slice(2)){
 let output;const files=[];
 for(let i=0;i<argv.length;i++){if(argv[i]==='--output')output=argv[++i];else if(argv[i].startsWith('--'))throw new Error('UNKNOWN_ARGUMENT');else files.push(path.resolve(argv[i]));}
 need(output&&files.length,'Usage: aggregate-browser-campaigns.js --output receipt.json shard-report.json ...');
 let result;
 try{
  const reports=files.map(file=>JSON.parse(fs.readFileSync(file,'utf8')));result=aggregateReports(reports);
  need(canonical(sourceManifest())===canonical(result.inputs),'CURRENT_INPUTS_DIFFER_FROM_SHARDS');
  result.shardReceipts=files.map((file,index)=>({file,sha256:sha(fs.readFileSync(file)),artifacts:verifyArtifacts(reports[index],file)}));
  result.checkedAt=new Date().toISOString();
 }catch(error){result={status:'failed',checkedAt:new Date().toISOString(),error:String(error.message||error),shardFiles:files};process.exitCode=1;}
 fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,cases:result.caseCount,report:path.resolve(output),error:result.error}));
}
if(require.main===module){try{main();}catch(error){console.error(error.message);process.exitCode=2;}}
module.exports={aggregateReports,verifyArtifacts,main};
