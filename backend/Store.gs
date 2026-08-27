function spreadsheet_() {
  var id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if(!id)throw apiError_('CONFIG_ERROR','Service configuration is incomplete.','SPREADSHEET_ID is not configured.');
  return SpreadsheetApp.openById(id);
}
function sheet_(name){if(!SCHEMA[name])throw new Error('Unknown schema name: '+name);var s=spreadsheet_().getSheetByName(name);if(!s)throw apiError_('SCHEMA_ERROR','Service configuration is incomplete.','Missing sheet: '+name);return s}
function rows_(name){
  var s=sheet_(name),headers=SCHEMA[name],last=s.getLastRow();if(last<2)return [];
  var values=s.getRange(2,1,last-1,headers.length).getValues();return values.map(function(row){var o={};headers.forEach(function(h,i){o[h]=row[i]});return o});
}
function appendRows_(name,objects){if(!objects.length)return;var headers=SCHEMA[name],values=objects.map(function(o){return headers.map(function(h){return o[h]===undefined?'':o[h]})});var s=sheet_(name);s.getRange(s.getLastRow()+1,1,values.length,headers.length).setValues(values);clearCache_(name)}
function updateById_(name,idColumn,id,changes){
  var s=sheet_(name),headers=SCHEMA[name],last=s.getLastRow(),idx=headers.indexOf(idColumn);if(idx<0)throw new Error('Unknown ID column '+idColumn+' for '+name);if(last<2)return null;
  var values=s.getRange(2,1,last-1,headers.length).getValues();for(var i=0;i<values.length;i++)if(String(values[i][idx])===String(id)){var before={};headers.forEach(function(h,j){before[h]=values[i][j];if(changes[h]!==undefined)values[i][j]=changes[h]});s.getRange(i+2,1,1,headers.length).setValues([values[i]]);clearCache_(name);return before}return null;
}
function nextId(entity){var lock=LockService.getScriptLock();lock.waitLock(30000);try{return nextIdUnlocked_(entity)}finally{lock.releaseLock()}}
function nextIdUnlocked_(entity){
  var prefix=ID_DEFINITIONS[entity];if(!prefix)throw new Error('Unknown ID entity: '+entity);
  var s=sheet_('ID_Counters'),last=s.getLastRow(),values=last>1?s.getRange(2,1,last-1,SCHEMA.ID_Counters.length).getValues():[];
  var matches=[];for(var i=0;i<values.length;i++)if(String(values[i][0])===entity)matches.push(i);if(matches.length>1)throw new Error('Duplicate ID counter rows for '+entity);
  if(matches.length===1){var rowIndex=matches[0];if(String(values[rowIndex][1])!==prefix)throw new Error('Counter prefix mismatch for '+entity+': expected '+prefix);var current=Number(values[rowIndex][2]);if(!isFinite(current)||current<0||Math.floor(current)!==current)throw new Error('Invalid counter for '+entity);var next=current+1;s.getRange(rowIndex+2,1,1,4).setValues([[entity,prefix,next,now_()]]);return prefix+String(next).padStart(6,'0')}
  var source=ID_SOURCES[entity],highest=0;rows_(source[0]).forEach(function(r){var match=String(r[source[1]]||'').match(new RegExp('^'+prefix+'(\\d{6,})$'));if(match)highest=Math.max(highest,Number(match[1]))});var first=highest+1;s.getRange(s.getLastRow()+1,1,1,4).setValues([[entity,prefix,first,now_()]]);return prefix+String(first).padStart(6,'0');
}
function now_(){return new Date().toISOString()}
function cacheRows_(name,seconds){var c=CacheService.getScriptCache(),key='rows:'+name,cached=c.get(key);if(cached)return JSON.parse(cached);var data=rows_(name);c.put(key,JSON.stringify(data),seconds||300);return data}
function clearCache_(name){CacheService.getScriptCache().remove('rows:'+name)}
function audit_(user,action,type,id,affiliateId,before,after,context){context=context||{};if(!context.force&&!config_('AUDIT_ENABLED'))return;appendRows_('Audit_Log',[{Audit_ID:nextId('Audit'),Timestamp:now_(),User_ID:user&&user.Staff_ID||'SYSTEM',Username:user&&user.Username||'SYSTEM',Role:user&&user.Role||'SYSTEM',Action:action,Entity_Type:type,Entity_ID:id||'',Affiliate_ID:affiliateId||'',Old_Value:JSON.stringify(before||null),New_Value:JSON.stringify(after||null),Details:context.details||'',IP_Address:'',Session_ID:context.sessionId||'',Request_ID:context.requestId||''}])}
function page_(items,payload){var size=Math.max(1,Math.min(Number(payload.pageSize)||50,100)),page=Math.max(1,Number(payload.page)||1),start=(page-1)*size;return {items:items.slice(start,start+size),page:page,pageSize:size,total:items.length}}
