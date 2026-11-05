const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
function boot(){const d=new JSDOM('<body></body>',{runScripts:'dangerously'});for(const p of ['93-ui/70-provider-hud','96-map/90-service-scene','96-map/95-provider-canvas'])d.window.eval(fs.readFileSync(`src/game/${p}.js`,'utf8'));return d;}
const rect=(p,w,h)=>({left:p.x-w/2,right:p.x+w/2,top:p.y-h/2,bottom:p.y+h/2});
function separated(a,b){return a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top;}
test('AC-SOC-634 owned estate wraps sites and links and keeps customer above every19-resource14-project hit rectangle',()=>{
 const dom=boot(),api=dom.window.SOCProviderCanvas;
 for(const width of [390,1366,1440])for(const resourceCount of [1,19,33,60]){
  const input={width,minHeight:300,sites:['branch','head','ingress'],links:['primary','head-ingress','branch-ingress'],resources:Array.from({length:resourceCount},(_,i)=>'resource-'+i)},before=JSON.stringify(input),l=api.serviceLayout(input);
  const cards=[rect({x:width/2,y:l.customerY},200,l.customerHeight),...[...l.positions.values()].map(p=>rect(p,l.nodeWidth,l.nodeHeight))];
  for(const [i,a] of cards.entries()){assert.ok(a.left>=0&&a.right<=width&&a.top>=0&&a.bottom<=l.height);for(const b of cards.slice(i+1))assert.ok(separated(a,b),`${width}/${resourceCount}: intersecting hit rectangles`);}
  assert.equal(l.customerY,56);assert.ok(l.nodeWidth>=160);assert.ok(l.nodeHeight>=44);assert.equal(JSON.stringify(input),before);
 }
 dom.window.close();
});
test('AC-SOC-635 one two and twenty geographical customers retain full200x88 nonoverlapping targets',()=>{
 const dom=boot();for(const width of [390,1366,1440])for(const count of [1,2,20]){const customers=Array.from({length:count},(_,i)=>({id:'customer-'+i,market:'au-sydney'})),l=dom.window.SOCProviderCanvas.portfolioPositions(customers,{width,height:600}),cards=[...l.positions.values()].map(([x,y])=>rect({x:x/100*l.width,y:y/100*l.height},200,88));for(const [i,a] of cards.entries())for(const b of cards.slice(i+1))assert.ok(separated(a,b));}dom.window.close();
});
test('AC-SOC-636 rendered transport buttons and SVG paths share positions; camera selection and model remain pure',()=>{
 const dom=boot(),w=dom.window,sites=['head','branch','ingress'].map(id=>({id,name:id,observed:{ready:true}})),links=[{id:'primary',from:'head',to:'branch'},{id:'backup',from:'head',to:'branch'},{id:'ingress-link',from:'ingress',to:'head'}].map(l=>({...l,observed:{ready:true},effective:{capacityMbps:20}})),model={customers:[{id:'customer',name:'Orchard',market:'au-sydney',services:Array.from({length:19},(_,i)=>({id:'r'+i,observed:{ready:true}})),transport:{version:1,sites,links,bindings:[]}}],projects:Array.from({length:14},(_,i)=>({id:'p'+i,customerId:'customer',kind:'operation',operationId:'paid-'+i,status:'complete',resources:[]}))},view={layer:'services',selection:{customerId:'customer'},viewport:{width:390,height:600},camera:{x:12,y:-14,zoom:1}},before=JSON.stringify({model,view});
 w.document.body.innerHTML=w.SOCProviderCanvas.render(model,view);assert.equal(w.document.querySelectorAll('.provider-resource-node').length,39);assert.equal(w.document.querySelectorAll('.provider-transport-link-node').length,3);const labels=[...w.document.querySelectorAll('.provider-transport-link-node')].map(n=>n.getAttribute('aria-label'));assert.equal(new Set(labels).size,3);
 const primary=w.document.querySelector('path[data-id="customer:transport-path:primary"]'),head=w.document.querySelector('button[data-id="customer:transport-site:head"]'),branch=w.document.querySelector('button[data-id="customer:transport-site:branch"]');const pos=n=>[parseFloat(n.style.getPropertyValue('--x')),parseFloat(n.style.getPropertyValue('--y'))];assert.equal(primary.getAttribute('d'),`M${pos(head).join(' ')} L${pos(branch).join(' ')}`);assert.match(w.document.querySelector('.provider-geography').getAttribute('style'),/--camera-x:12px;--camera-y:-14px;--zoom:1/);assert.equal(JSON.stringify({model,view}),before);dom.window.close();
});
