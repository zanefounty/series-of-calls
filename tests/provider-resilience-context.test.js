const test=require('node:test');
const assert=require('node:assert/strict');
const CONTEXT=require('../src/game/93-ui/79-provider-context-actions.js');

test('transport context groups paid path and binding options separately from a failure repair',()=>{
 const customer={id:'orchard',transport:{version:1}},actions=[
  {id:'primary-upstream',available:true,blockers:[],quote:{setupCents:48000}},
  {id:'diverse-upstream',available:false,blockers:['PAID_PRIMARY_REQUIRED'],quote:{setupCents:24000}},
  {id:'managed-diverse-upstream',available:true,blockers:[],quote:{setupCents:8000}},
  {id:'upstream-binding-extension',available:true,blockers:[],quote:{setupCents:8000}},
  {id:'transport-repair',available:true,blockers:[],quote:{setupCents:10000}},
  {id:'primary-upstream',customerId:'other',available:true,blockers:[]},
  {id:'unrelated-free-operation',available:true,blockers:[]}
 ],before=JSON.stringify({customer,actions}),result=CONTEXT.transport(customer,actions);
 assert.equal(JSON.stringify({customer,actions}),before,'context projection is pure');
 assert.deepEqual(result.choices.map(x=>x.id),['primary-upstream','diverse-upstream','managed-diverse-upstream','upstream-binding-extension']);
 assert.equal(result.choices[1].available,false,'parent eligibility refusal remains visible');
 assert.deepEqual(result.recovery.map(x=>x.id),['transport-repair']);
 assert.equal(result.customerId,'orchard');
});

test('transport context emits nothing for legacy or unknown versions',()=>{
 assert.equal(CONTEXT.transport({id:'orchard'},[{id:'primary-upstream',available:true}]),null);
 assert.equal(CONTEXT.transport({id:'orchard',transport:{version:2}},[{id:'primary-upstream',available:true}]),null);
});
