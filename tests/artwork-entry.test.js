const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {load,browser,flush}=require('./harness');
const root=path.resolve(__dirname,'..');
test('AC-SOC-393 training opens from the real title button before any SP game exists',async t=>{
 const b=browser(),x=load({browser:b});t.after(()=>{x.ev('socClose()');b.close(x.dom.window);x.dom.window.close();});
 x.ev('S=null;showTitle()');const d=x.dom.window.document;
 assert.equal(x.ev('S'),null);assert.ok(d.querySelector('#modalCard img[src="images/launch-640.webp"]'));
 d.querySelector('#modalCard [data-act="training"]').click();await flush();await flush();
 assert.ok(d.querySelector('#soc-console'));assert.equal(x.ev('SCT.locked'),true);assert.equal(x.ev('S'),null);
 assert.ok(d.querySelector('#soc-console img[src="images/smb-640.webp"]'));assert.deepEqual(x.errors,[]);
});
test('AC-SOC-394 artwork provenance and exported icons match the actual files and install manifest',()=>{
 const m=JSON.parse(fs.readFileSync(path.join(root,'artwork/manifest.json')));
 const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
 assert.deepEqual(m.assets.map(a=>a.id),['launch','smb','enterprise','government','defence','sp']);
 for(const a of m.assets){assert.equal(hash(a.source),a.sourceSha256);for(const out of a.outputs){assert.equal(hash(out.path),out.sha256);assert.ok(out.bytes<300000,'responsive artwork stays bounded');}}
 for(const a of m.derived)assert.equal(hash(a.path),a.sha256);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'site/site.webmanifest')));
 for(const icon of manifest.icons){assert.ok(fs.existsSync(path.join(root,'site',icon.src)));if(icon.type==='image/png'){const bytes=fs.readFileSync(path.join(root,'site',icon.src)),size=Number(icon.sizes.split('x')[0]);assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);}}
 assert.ok(manifest.icons.some(i=>i.purpose==='maskable'));
});
