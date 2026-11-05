/* Presentation preferences are independent of simulations and career saves. */
(function(g){
 'use strict';
 const KEY='series-of-calls:service-preferences:v1';
 const defaults={version:1,sound:false,animation:true,reducedMotion:false,alerts:true,inputHelp:true,language:'en'};
 function validate(value){const out={...defaults};if(!value||value.version!==1)return out;for(const key of ['sound','animation','reducedMotion','alerts','inputHelp'])if(typeof value[key]==='boolean')out[key]=value[key];if(['en','de','es','fr','it','pt'].includes(value.language))out.language=value.language;return out;}
 function read(storage){try{return validate(JSON.parse(storage.getItem(KEY)));}catch{return {...defaults};}}
 function write(storage,value){const next=validate(value);storage.setItem(KEY,JSON.stringify(next));return next;}
 g.SOCServicePreferences={KEY,defaults,validate,read,write};
})(globalThis);
