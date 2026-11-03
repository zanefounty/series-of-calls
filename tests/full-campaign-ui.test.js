const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./harness');
const {campaignJourney,verifyCheckpoint}=require('../scripts/lib/campaign-journey');
const {campaignUiAction}=require('../scripts/lib/campaign-ui');
const {referenceUiAction,advanceButtonPlan}=require('../scripts/browser-campaigns');
test('AC-SOC-437 visible campaign controls execute procurement through renewal for all four tracks',()=>{
 const {dom,ev,errors}=load(),window=dom.window,document=window.document;
 try{
  ev("SCT.state=SOC.create({scenario:'smb',jurisdiction:'US',mode:'assessed'});SCT.locked=true;socRender();");
  const click=selector=>{const node=document.querySelector(selector);assert.ok(node,'missing control '+selector);assert.equal(node.disabled,false,selector+' disabled');node.click();assert.equal(ev('SCT.error'),'');};
  const submit=(selector,fields)=>{
   const form=document.querySelector(selector);assert.ok(form,selector);
   for(const [key,value] of Object.entries(fields)){
    const control=form.elements[key];assert.ok(control,selector+':'+key);
    if(control.type==='checkbox')control.checked=Boolean(value);else control.value=Array.isArray(value)?JSON.stringify(value):String(value);
    control.dispatchEvent(new window.Event('change',{bubbles:true}));
   }
   form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));assert.equal(ev('SCT.error'),'');
  };
  for(const step of campaignJourney({jurisdiction:'US'}).steps){
   if(step.checkpoint){verifyCheckpoint(JSON.parse(ev('JSON.stringify(SCT.state)')),step.checkpoint);continue;}
   const ui=campaignUiAction(step.command,ev('SCT.state.clock'))||referenceUiAction(step.command);
   if(ui.kind==='button')click(ui.selector);
   else if(ui.kind==='resource-form'){click(ui.select);submit(ui.form,ui.fields);}
   else if(ui.kind==='clock-buttons'){
    // The 60-minute business button is itself a real UI command and avoids
    // hundreds of repeated full DOM rebuilds during the unit rehearsal.
    let minutes=ui.minutes;
    while(minutes>=60&&document.querySelector('[data-biz="period"]')){click('[data-biz="period"]');minutes-=60;}
    if(minutes){const plan=advanceButtonPlan(minutes);for(let n=0;n<plan.five;n++)click(ui.buttons[0]);for(let n=0;n<plan.minute;n++)click(ui.buttons[1]);}
   }else submit(ui.form,ui.fields);
  }
  assert.equal(ev('SCT.state.campaign.awards.length'),4);assert.equal(errors.length,0,errors.join('\n'));
 }finally{dom.window.close();}
});
