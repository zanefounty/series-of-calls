/* Versioned, finite authored choices for the SMB campaign. */
function socProviderVariantsKernel(){
 'use strict';
 const N_=key=>key;
 const VERSION=1,IDS=Object.freeze(['standard','peak-window','short-promise']);
 const sourceData=Object.freeze({
  standard:Object.freeze({version:VERSION,id:'standard',nameKey:N_('provider.variant.smb.standard.name'),descriptionKey:N_('provider.variant.smb.standard.description'),demand:null,incident:null}),
  'peak-window':Object.freeze({version:VERSION,id:'peak-window',nameKey:N_('provider.variant.smb.peak_window.name'),descriptionKey:N_('provider.variant.smb.peak_window.description'),demand:Object.freeze({voiceMinutes:Object.freeze([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]),digitalMinutes:Object.freeze([20,25,30,35,40,45,50,55]),voiceDuration:4,deadlineMinutes:8}),incident:null}),
  'short-promise':Object.freeze({version:VERSION,id:'short-promise',nameKey:N_('provider.variant.smb.short_promise.name'),descriptionKey:N_('provider.variant.smb.short_promise.description'),demand:Object.freeze({deadlineMinutes:5}),incident:Object.freeze({resource:'service',kind:'capacity'})})
 });
 const clone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
 const fail=code=>{throw new Error(code);};
 function known(id){if(typeof id!=='string'||!IDS.includes(id))fail('UNKNOWN_PROVIDER_VARIANT');return sourceData[id];}
 function get(id='standard'){return clone(known(id));}
 function demand(id,base){const variant=known(id);if(!base||typeof base!=='object'||Array.isArray(base))fail('INVALID_PROVIDER_VARIANT_BASE');const result=clone(base);if(variant.id==='peak-window'){result.voiceMinutes=clone(variant.demand.voiceMinutes);result.digitalMinutes=clone(variant.demand.digitalMinutes);result.voiceDuration=variant.demand.voiceDuration;result.deadlineMinutes=variant.demand.deadlineMinutes;}else if(variant.id==='short-promise')result.deadlineMinutes=variant.demand.deadlineMinutes;return result;}
 function incident(id,base){const variant=known(id);if(!base||typeof base!=='object'||Array.isArray(base))fail('INVALID_PROVIDER_VARIANT_BASE');const result=clone(base);if(variant.incident)for(const [key,value] of Object.entries(variant.incident))result[key]=value;return result;}
 function validate(choice){if(!choice||typeof choice!=='object'||Array.isArray(choice)||Object.keys(choice).sort().join(',')!=='id,version'||choice.version!==VERSION)fail('INVALID_PROVIDER_VARIANT');known(choice.id);return true;}
 function source(){return `const SOC_PROVIDER_VARIANTS=(${socProviderVariantsKernel.toString()})();`;}
 return {VERSION,IDS:[...IDS],get,demand,incident,validate,source};
}
(function(g){
 'use strict';const N_=g.N_||(key=>key);
 g.SOC_PROVIDER_VARIANT_LABELS=Object.freeze({
  standard:Object.freeze({name:N_('provider.variant.smb.standard.name'),description:N_('provider.variant.smb.standard.description')}),
  'peak-window':Object.freeze({name:N_('provider.variant.smb.peak_window.name'),description:N_('provider.variant.smb.peak_window.description')}),
  'short-promise':Object.freeze({name:N_('provider.variant.smb.short_promise.name'),description:N_('provider.variant.smb.short_promise.description')})
 });
})(globalThis);
const SOC_PROVIDER_VARIANTS=socProviderVariantsKernel();
if(typeof globalThis!=='undefined')globalThis.SOC_PROVIDER_VARIANTS=SOC_PROVIDER_VARIANTS;
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_VARIANTS;
