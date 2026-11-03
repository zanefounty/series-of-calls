const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {handler}=require('../scripts/serve');
test('project preview serves compiled files under its base path, including notices and HEAD',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'soc-preview-'));try{fs.writeFileSync(path.join(root,'index.html'),'<h1>Preview</h1>');fs.writeFileSync(path.join(root,'LICENSE'),'MIT');const app=handler(root);const request=(url,method='GET')=>{const r={};app({url,method},{writeHead:(status,headers)=>Object.assign(r,{status,headers}),end:body=>{r.body=body;}});return r;};
 assert.equal(request('/').headers.Location,'/series-of-calls/');assert.equal(request('/series-of-calls').status,302);assert.equal(request('/series-of-calls/').body.toString(),'<h1>Preview</h1>');assert.equal(request('/series-of-calls/LICENSE').headers['Content-Type'],'text/plain; charset=utf-8');assert.equal(request('/series-of-calls/','HEAD').body,undefined);assert.equal(request('/series-of-calls/','POST').status,405);assert.equal(request('/other/').status,404);
 for(const url of ['/series-of-calls/..%2foutside','/series-of-calls/%2e%2e%2foutside','/series-of-calls/missing'])assert.equal(request(url).status,404);
 assert.equal(request('/series-of-calls/%zz').status,400);assert.equal(request('/series-of-calls/%00').status,400);fs.symlinkSync(os.tmpdir(),path.join(root,'escape'));assert.equal(request('/series-of-calls/escape/anything').status,404);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
