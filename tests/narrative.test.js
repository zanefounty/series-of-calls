const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),vm=require('node:vm');
const pack=require('../content/narrative.json'),source=require('../research/source/series-of-calls-full-mapping.json');
const {load,browser}=require('./harness');
test('AC-SOC-071 source-linked humour preserves role boundaries and cannot determine simulation outcomes',async t=>{
 const ids=new Set(),sources=new Set(),contexts=new Set();
 for(const entry of pack.entries){
  assert.ok(!ids.has(entry.id));ids.add(entry.id);assert.ok(!sources.has(entry.source));sources.add(entry.source);
  const row=source.rows.find(r=>r.id===entry.source);assert.ok(row,entry.source);
  const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
  // Match the Python canonical JSON serializer including default separators.
  const pythonJson=JSON.stringify(canonical(row)).replace(/(:|,)(?=(?:[^"\\]|\\.|"(?:[^"\\]|\\.)*")*$)/g,'$1 ');
  assert.equal(crypto.createHash('sha256').update(pythonJson).digest('hex'),entry.sourceRecordSha256,entry.source);
  assert.equal(entry.name,row.uc_name);assert.ok(entry.comparison.length>20);
  for(const kind of entry.contexts){assert.ok(!contexts.has(kind),'ambiguous flavour binding '+kind);contexts.add(kind);}
 }
 assert.match(pack.entries.find(e=>e.source==='asset:RG:3').text,/forklift/);
 assert.match(pack.entries.find(e=>e.source==='asset:RG:14').text,/royal family/);
 assert.match(pack.entries.find(e=>e.source==='ai-dialogue:3').text,/dry run/);
 const b=browser(),x=load({browser:b});t.after(()=>{x.ev('socClose()');b.close(x.dom.window);x.dom.window.close();});
 await x.ev('socOpen()');const before=x.ev('JSON.stringify(SCT.state)');
 x.ev('socRender();socRender()');assert.equal(x.ev('JSON.stringify(SCT.state)'),before);
 const doc=x.dom.window.document;assert.equal(doc.querySelectorAll('#soc-narrative [data-narrative]').length,pack.entries.length);
 assert.match(doc.querySelector('.soc-flavour').textContent,/quiet afternoon/);
 assert.match(doc.querySelector('#soc-narrative').textContent,/still in development/);
 x.ev("socAdvance(1);socClick('interaction');socAdvance(5)");
 assert.equal(x.ev('SOC.assess(SCT.state).passed'),false,'a witty description cannot supply missing staff');
 assert.deepEqual(x.errors,[]);
});
