/* Versioned, bounded accounting for synthetic information records. */
function socInformationRecordStoreKernel(){
 'use strict';
 const VERSION=1,RECORDS_PER_ARCHIVE_UNIT=100,LEGACY_MAX_ROWS=500,MAX_TOTAL_ROWS=4000,MAX_LIVE_RECORDS=2000,MAX_ORIGIN_RECEIPTS=MAX_TOTAL_ROWS;
 const fail=code=>{throw new Error(code);};
 const integer=(value,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
 const id=value=>typeof value==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(value);
 const create=()=>({version:VERSION});
 const destination=(record)=>{
  const explicit=record?.archiveId,storage=record?.storage?.resourceId,initial=record?.origin?.initialStorage?.resourceId;
  if(explicit!==undefined&&(!id(explicit)||storage!==undefined&&storage!==explicit))fail('INVALID_RECORD_STORE_DESTINATION');
  return explicit||storage||initial||'archive';
 };
 const payload=record=>!!record&&record.kind!=='meeting-probe';
 function usage(records,{resourceId='archive',region}={}){
  if(!Array.isArray(records)||!id(resourceId)||region!==undefined&&!['AU','US','JP','EU'].includes(region))fail('INVALID_RECORD_STORE_QUERY');
  let used=0,held=0;
  for(const record of records){
   if(!payload(record)||record.deleted===true||destination(record)!==resourceId||region!==undefined&&record.region!==region)continue;
   used++;if(record.held===true)held++;
  }
  return {used,held};
 }
 function limit(archiveUnits){if(!integer(archiveUnits,0,Math.floor(Number.MAX_SAFE_INTEGER/RECORDS_PER_ARCHIVE_UNIT)))fail('INVALID_RECORD_STORE_CAPACITY');return archiveUnits*RECORDS_PER_ARCHIVE_UNIT;}
 function storeVersion(store){
  if(store===undefined)return 0;
  if(!store||Array.isArray(store)||Object.keys(store).join(',')!=='version'||store.version!==VERSION)fail('INVALID_RECORD_STORE_VERSION');
  return VERSION;
 }
 function admission(rootOrRecords,{resourceId='archive',region,capacityUnits,additional=1,candidate,measureBytes=false,store}={}){
  const root=Array.isArray(rootOrRecords)?{records:rootOrRecords,recordStore:store}:rootOrRecords;
  if(!root||!Array.isArray(root.records)||!integer(additional,1,MAX_LIVE_RECORDS))fail('INVALID_RECORD_STORE_QUERY');
  if(!id(resourceId)||!['AU','US','JP','EU'].includes(region)||!integer(capacityUnits,0,Math.floor(Number.MAX_SAFE_INTEGER/RECORDS_PER_ARCHIVE_UNIT)))return {accepted:false,used:0,limit:0,required:additional,rows:root.records.length,rowsLimit:storeVersion(root.recordStore)===VERSION?MAX_TOTAL_ROWS:LEGACY_MAX_ROWS,currentBytes:null,projectedBytes:null,reason:'ARCHIVE_RESOURCE_UNAVAILABLE'};
  const version=storeVersion(root.recordStore),used=usage(root.records,{resourceId,region}).used,capacityLimit=limit(capacityUnits),required=used+additional;
  const rowsLimit=version===VERSION?MAX_TOTAL_ROWS:LEGACY_MAX_ROWS;
  let reason=null;
  if(root.records.length+additional>rowsLimit)reason=version===VERSION?'RECORD_REPRESENTATION_CAPACITY':'RECORD_CAPACITY';
  else if(required>capacityLimit)reason='ARCHIVE_CAPACITY';
  else if(required>MAX_LIVE_RECORDS&&version===VERSION)reason='RECORD_REPRESENTATION_CAPACITY';
  const currentBytes=measureBytes||candidate!==undefined?serializedBytes(rootOrRecords):null;
  const projectedBytes=currentBytes===null?null:currentBytes+(candidate===undefined?0:serializedBytes(candidate)+1);
  return {accepted:reason===null,used,limit:capacityLimit,required,rows:root.records.length,rowsLimit,currentBytes,projectedBytes,reason};
 }
 function serializedBytes(value){
  const text=JSON.stringify(value);
  if(typeof TextEncoder==='function')return new TextEncoder().encode(text).length;
  return unescape(encodeURIComponent(text)).length;
 }
 function validate(root){
  if(!root||!Array.isArray(root.records))fail('INVALID_RECORD_STORE_ROOT');
  const version=storeVersion(root.recordStore),maxRows=version===VERSION?MAX_TOTAL_ROWS:LEGACY_MAX_ROWS;
  if(root.records.length>maxRows)fail(version===VERSION?'INVALID_RECORD_STORE_CAPACITY':'INVALID_RECORD_STORE_VERSION_REQUIRED');
  const maxLive=version===VERSION?MAX_LIVE_RECORDS:LEGACY_MAX_ROWS;
  const destinations=new Map();
  for(const record of root.records){
   if(!record||record.archiveId!==undefined&&destination(record)!==record.archiveId)fail('INVALID_RECORD_STORE_DESTINATION');
   if(record.archiveId!==undefined&&root.resources&&root.resources[record.archiveId]?.kind!=='archive')fail('INVALID_RECORD_STORE_DESTINATION');
   if(!payload(record)||record.deleted===true)continue;
   const key=`${destination(record)}\u0000${record.region}`;
   destinations.set(key,(destinations.get(key)||0)+1);
   if(destinations.get(key)>maxLive)fail('INVALID_RECORD_STORE_CAPACITY');
  }
  return {version:version||null,rows:root.records.length,live:[...destinations].map(([key,used])=>({destination:key.split('\u0000')[0],region:key.split('\u0000')[1],used}))};
 }
 const source=()=>`const SOC_INFORMATION_RECORD_STORE=(${socInformationRecordStoreKernel.toString()})();`;
 return {VERSION,RECORDS_PER_ARCHIVE_UNIT,LEGACY_MAX_ROWS,MAX_TOTAL_ROWS,MAX_LIVE_RECORDS,MAX_ORIGIN_RECEIPTS,create,usage,limit,admission,validate,serializedBytes,source};
}
const SOC_INFORMATION_RECORD_STORE=socInformationRecordStoreKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_INFORMATION_RECORD_STORE;
