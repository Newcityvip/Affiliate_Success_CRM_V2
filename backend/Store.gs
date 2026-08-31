var REQUEST_CONTEXT=null;
function beginRequest_(){REQUEST_CONTEXT={spreadsheet:null,sheets:{},rows:{},metrics:{authMs:0,spreadsheetOpenMs:0,sheetReadMs:0,sheetReads:0,rowsRead:0}}}
function context_(){if(!REQUEST_CONTEXT)beginRequest_();return REQUEST_CONTEXT}
function requestMetrics_(){return context_().metrics}
function spreadsheet_() {
  var ctx=context_();if(ctx.spreadsheet)return ctx.spreadsheet;
  var id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if(!id)throw apiError_('CONFIG_ERROR','Service configuration is incomplete.','SPREADSHEET_ID is not configured.');
  var started=Date.now();ctx.spreadsheet=SpreadsheetApp.openById(id);ctx.metrics.spreadsheetOpenMs+=Date.now()-started;return ctx.spreadsheet;
}
function sheet_(name){if(!SCHEMA[name])throw new Error('Unknown schema name: '+name);var ctx=context_();if(ctx.sheets[name])return ctx.sheets[name];var s=spreadsheet_().getSheetByName(name);if(!s)throw apiError_('SCHEMA_ERROR','Service configuration is incomplete.','Missing sheet: '+name);ctx.sheets[name]=s;return s}
function rows_(name){
  var ctx=context_();if(ctx.rows[name])return ctx.rows[name];var s=sheet_(name),headers=SCHEMA[name],last=s.getLastRow();if(last<2)return ctx.rows[name]=[];
  var started=Date.now(),values=s.getRange(2,1,last-1,headers.length).getValues();ctx.metrics.sheetReadMs+=Date.now()-started;ctx.metrics.sheetReads++;ctx.metrics.rowsRead+=values.length;return ctx.rows[name]=values.map(function(row){var o={};headers.forEach(function(h,i){o[h]=row[i]});return o});
}
function findRowRecord_(name,column,value,caseSensitive){var headers=SCHEMA[name],columnIndex=headers.indexOf(column);if(columnIndex<0)throw new Error('Unknown lookup column '+column+' for '+name);var s=sheet_(name),match=s.getRange(2,columnIndex+1,Math.max(s.getLastRow()-1,1),1).createTextFinder(String(value)).matchEntireCell(true).matchCase(caseSensitive!==false).findNext();if(!match)return null;var row=s.getRange(match.getRow(),1,1,headers.length).getValues()[0],object={};headers.forEach(function(h,i){object[h]=row[i]});return {rowNumber:match.getRow(),value:object}}
function findRow_(name,column,value,caseSensitive){var found=findRowRecord_(name,column,value,caseSensitive);return found&&found.value}
function appendRows_(name,objects){if(!objects.length)return;var headers=SCHEMA[name],values=objects.map(function(o){return headers.map(function(h){return o[h]===undefined?'':o[h]})});var s=sheet_(name);s.getRange(s.getLastRow()+1,1,values.length,headers.length).setValues(values);clearCache_(name)}
function updateById_(name,idColumn,id,changes){var headers=SCHEMA[name],found=findRowRecord_(name,idColumn,id,true);if(!found)return null;var before=found.value,row=headers.map(function(h){return changes[h]===undefined?before[h]:changes[h]});sheet_(name).getRange(found.rowNumber,1,1,headers.length).setValues([row]);clearCache_(name);return before}
function updateRowsWhere_(name,predicate,changes){var headers=SCHEMA[name],data=rows_(name),s=sheet_(name),updated=[];data.forEach(function(row,index){if(!predicate(row))return;var before={};headers.forEach(function(h){before[h]=row[h]});var next=typeof changes==='function'?changes(row):changes;Object.keys(next).forEach(function(k){row[k]=next[k]});s.getRange(index+2,1,1,headers.length).setValues([headers.map(function(h){return row[h]===undefined?'':row[h]})]);updated.push(before)});if(updated.length)clearCache_(name);return updated}
function nextId(entity){var lock=LockService.getScriptLock();lock.waitLock(30000);try{return nextIdUnlocked_(entity)}finally{lock.releaseLock()}}
function nextIdUnlocked_(entity){
  var prefix=ID_DEFINITIONS[entity];if(!prefix)throw new Error('Unknown ID entity: '+entity);
  var s=sheet_('ID_Counters'),last=s.getLastRow(),values=last>1?s.getRange(2,1,last-1,SCHEMA.ID_Counters.length).getValues():[];
  var matches=[];for(var i=0;i<values.length;i++)if(String(values[i][0])===entity)matches.push(i);if(matches.length>1)throw new Error('Duplicate ID counter rows for '+entity);
  if(matches.length===1){var rowIndex=matches[0];if(String(values[rowIndex][1])!==prefix)throw new Error('Counter prefix mismatch for '+entity+': expected '+prefix);var current=Number(values[rowIndex][2]);if(!isFinite(current)||current<0||Math.floor(current)!==current)throw new Error('Invalid counter for '+entity);var next=current+1;s.getRange(rowIndex+2,1,1,4).setValues([[entity,prefix,next,now_()]]);return prefix+String(next).padStart(6,'0')}
  var source=ID_SOURCES[entity],highest=0;rows_(source[0]).forEach(function(r){var match=String(r[source[1]]||'').match(new RegExp('^'+prefix+'(\\d{6,})$'));if(match)highest=Math.max(highest,Number(match[1]))});var first=highest+1;s.getRange(s.getLastRow()+1,1,1,4).setValues([[entity,prefix,first,now_()]]);return prefix+String(first).padStart(6,'0');
}
function reserveIdsUnlocked_(entity,count){
  count=Number(count);if(!isFinite(count)||count<0||Math.floor(count)!==count)throw new Error('Invalid ID reservation count.');if(!count)return [];
  var prefix=ID_DEFINITIONS[entity];if(!prefix)throw new Error('Unknown ID entity: '+entity);var s=sheet_('ID_Counters'),last=s.getLastRow(),values=last>1?s.getRange(2,1,last-1,SCHEMA.ID_Counters.length).getValues():[],matches=[];
  for(var i=0;i<values.length;i++)if(String(values[i][0])===entity)matches.push(i);if(matches.length>1)throw new Error('Duplicate ID counter rows for '+entity);var current=0,rowNumber;
  if(matches.length===1){var rowIndex=matches[0];if(String(values[rowIndex][1])!==prefix)throw new Error('Counter prefix mismatch for '+entity+': expected '+prefix);current=Number(values[rowIndex][2]);if(!isFinite(current)||current<0||Math.floor(current)!==current)throw new Error('Invalid counter for '+entity);rowNumber=rowIndex+2}
  else{var source=ID_SOURCES[entity];rows_(source[0]).forEach(function(r){var match=String(r[source[1]]||'').match(new RegExp('^'+prefix+'(\\d{6,})$'));if(match)current=Math.max(current,Number(match[1]))});rowNumber=s.getLastRow()+1}
  var end=current+count;s.getRange(rowNumber,1,1,4).setValues([[entity,prefix,end,now_()]]);var ids=[];for(i=current+1;i<=end;i++)ids.push(prefix+String(i).padStart(6,'0'));return ids;
}
function now_(){return new Date().toISOString()}
function cacheRows_(name,seconds){var c=CacheService.getScriptCache(),key='rows:'+name,cached=c.get(key);if(cached)return JSON.parse(cached);var data=rows_(name);c.put(key,JSON.stringify(data),seconds||300);return data}
function clearCache_(name){var ctx=context_();delete ctx.rows[name];CacheService.getScriptCache().remove('rows:'+name)}
function audit_(user,action,type,id,affiliateId,before,after,context){context=context||{};if(!context.force&&!config_('AUDIT_ENABLED'))return;appendRows_('Audit_Log',[{Audit_ID:nextId('Audit'),Timestamp:now_(),User_ID:user&&user.Staff_ID||'SYSTEM',Username:user&&user.Username||'SYSTEM',Role:user&&user.Role||'SYSTEM',Action:action,Entity_Type:type,Entity_ID:id||'',Affiliate_ID:affiliateId||'',Old_Value:JSON.stringify(before||null),New_Value:JSON.stringify(after||null),Details:context.details||'',IP_Address:'',Session_ID:context.sessionId||'',Request_ID:context.requestId||''}])}
function page_(items,payload){var size=Math.max(1,Math.min(Number(payload.pageSize)||50,100)),page=Math.max(1,Number(payload.page)||1),start=(page-1)*size;return {items:items.slice(start,start+size),page:page,pageSize:size,total:items.length}}
