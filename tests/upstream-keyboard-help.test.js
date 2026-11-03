const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness');
const {createSession,TOOLS}=require('../scripts/lib/mcp-game');

const mcpTools=(session)=>(name,args={})=>TOOLS.find((tool)=>tool.name===name).run(session,args);

// Source trace: upstream fix 48ba0048dab7c1e11ded28daf3526a32109ab69f (keys blob
// d2a708780f4a454f41a6c6297d5c891005345f73) handled title Help and '?' close. SOC's
// existing helpClose route already returns to title; these cases verify that adapted path.
function key(win,key,extra={}){
 const {target,...init}=extra;
 const event=new win.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...init});
 (target||win).dispatchEvent(event);return event;
}

test('AC-SOC-487 the Help shortcut reference opens from title, closes with its button, and does not start or mutate a network',()=>{
 const {dom,ev,errors}=load();const win=dom.window;
 ev('showTitle()');assert.equal(ev('S'),null);assert.equal(Boolean(ev('UI.started')),false);
 const before=ev('JSON.stringify({started:UI.started,save:localStorage.getItem("soc-sp-save-v1")})');
 win.document.querySelector('#modalCard [data-act="help"]').click();
 assert.equal(ev('S'),null);assert.equal(Boolean(ev('UI.started')),false);
 win.document.querySelector('#modalCard [data-act="keys"]').click();
 assert.equal(ev("document.getElementById('modal').className"),'keys');
 assert.match(ev("document.getElementById('modalCard').textContent"),/Space.*clock/i);
 assert.match(ev("document.getElementById('modalCard').textContent"),/0–4.*speed/i);
 assert.match(ev("document.getElementById('modalCard').textContent"),/\/.*city/i);
 win.document.querySelector('#modalCard [data-act="helpClose"]').click();
 assert.equal(ev('S'),null);assert.equal(Boolean(ev('UI.started')),false);
 assert.equal(ev("document.getElementById('modal').hidden"),false,'the title screen returns');
 assert.equal(ev("document.querySelector('#modalCard [data-act=help]')!==null"),true);
 assert.equal(ev('JSON.stringify({started:UI.started,save:localStorage.getItem("soc-sp-save-v1")})'),before);
 assert.deepEqual(errors,[]);
});

test('AC-SOC-488 ? closes the shortcut reference to title without creating a network',()=>{
 const {dom,ev,errors}=load();const win=dom.window;
 ev('showTitle()');
 win.document.querySelector('#modalCard [data-act="help"]').click();
 assert.equal(key(win,'?',{shiftKey:true}).defaultPrevented,false,'? does not close the existing Help dialog');
 assert.equal(ev("document.getElementById('modal').className"),'');
 win.document.querySelector('#modalCard [data-act="keys"]').click();
 const event=key(win,'?',{shiftKey:true});
 assert.equal(event.defaultPrevented,true);
 assert.equal(ev('S'),null);assert.equal(Boolean(ev('UI.started')),false);
 assert.equal(ev("document.querySelector('#modalCard [data-act=help]')!==null"),true);
 assert.deepEqual(errors,[]);
});

test('AC-SOC-489 the shortcut key ignores repeat, modifiers, editable controls and other modals',()=>{
 const {dom,ev,errors}=load();const win=dom.window;
 ev('showTitle()');
 win.document.querySelector('#modalCard [data-act="help"]').click();
 win.document.querySelector('#modalCard [data-act="keys"]').click();
 assert.equal(key(win,'?',{repeat:true}).defaultPrevented,false);
 assert.equal(key(win,'?',{ctrlKey:true}).defaultPrevented,false);
 const field=win.document.createElement('input');win.document.querySelector('#modalCard').append(field);field.focus();
 assert.equal(key(win,'?',{target:field,shiftKey:true}).defaultPrevented,false);
 assert.equal(ev("document.getElementById('modal').className"),'keys');
 field.remove();
 win.document.querySelector('#modalCard [data-act="helpClose"]').click();
 win.document.querySelector('#modalCard [data-act="help"]').click();
 win.document.querySelector('#modalCard [data-act="settings"]').click();
 assert.equal(key(win,'?').defaultPrevented,false);
 assert.equal(ev("document.getElementById('modal').hidden"),false);
 assert.doesNotMatch(ev("document.getElementById('modalCard').textContent"),/Keyboard shortcuts/);
 assert.equal(ev('S'),null);
 assert.deepEqual(errors,[]);
});

test('AC-SOC-490 the MCP keys action is a read-only view and helpClose returns to the game',()=>{
 const session=createSession();const call=mcpTools(session);
 const before=call('state');
 const opened=call('act',{action:'keys'});
 assert.equal(opened.outcome,'shown');
 assert.equal(opened.screen.where,'modal');
 assert.match(opened.screen.text,/Keyboard shortcuts/);
 assert.deepEqual(call('state'),before,'opening the shortcut reference does not mutate saved gameplay state');
 const closed=call('act',{action:'helpClose'});
 assert.equal(closed.outcome,'shown');
 assert.notEqual(closed.screen.where,'modal');
 assert.deepEqual(call('state'),before,'closing the reference also leaves gameplay state unchanged');
 assert.deepEqual(session.errors(),[]);
});
