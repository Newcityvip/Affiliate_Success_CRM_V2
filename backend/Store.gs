function spreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw apiError_('CONFIG_ERROR', 'SPREADSHEET_ID is not configured.');
  return SpreadsheetApp.openById(id);
}
function sheet_(name) { var s = spreadsheet_().getSheetByName(name); if (!s) throw apiError_('SCHEMA_ERROR','Missing sheet: '+name); return s; }
function rows_(name) {
  var s=sheet_(name), headers=SCHEMA[name], last=s.getLastRow(); if(last<2)return [];
  var values=s.getRange(2,1,last-1,headers.length).getValues();
  return values.map(function(row){var o={};headers.forEach(function(h,i){o[h]=row[i]});return o});
}
function appendRows_(name, objects) {
  if(!objects.length)return; var headers=SCHEMA[name], values=objects.map(function(o){return headers.map(function(h){return o[h]===undefined?'':o[h]})});
  var s=sheet_(name); s.getRange(s.getLastRow()+1,1,values.length,headers.length).setValues(values);
}
function updateById_(name,idColumn,id,changes) {
  var s=sheet_(name), headers=SCHEMA[name], last=s.getLastRow(); if(last<2)return null;
  var values=s.getRange(2,1,last-1,headers.length).getValues(), idx=headers.indexOf(idColumn);
  for(var i=0;i<values.length;i++)if(String(values[i][idx])===String(id)){var before={};headers.forEach(function(h,j){before[h]=values[i][j];if(changes[h]!==undefined)values[i][j]=changes[h]});s.getRange(i+2,1,1,headers.length).setValues([values[i]]);return before} return null;
}
function newId_(sheetName){return (ID_PREFIX[sheetName]||'ID')+'_'+Utilities.getUuid().replace(/-/g,'').slice(0,16).toUpperCase()}
function now_(){return new Date().toISOString()}
function cacheRows_(name,seconds){var c=CacheService.getScriptCache(),key='rows:'+name,cached=c.get(key);if(cached)return JSON.parse(cached);var data=rows_(name);c.put(key,JSON.stringify(data),seconds||300);return data}
function clearCache_(name){CacheService.getScriptCache().remove('rows:'+name)}
function audit_(user,action,type,id,before,after,requestId){appendRows_('Audit_Log',[{Audit_ID:newId_('Audit_Log'),Actor_Staff_ID:user&&user.Staff_ID||'SYSTEM',Action:action,Entity_Type:type,Entity_ID:id,Before_JSON:JSON.stringify(before||null),After_JSON:JSON.stringify(after||null),Request_ID:requestId||'',Created_At:now_()}])}
function page_(items,payload){var size=Math.max(1,Math.min(Number(payload.pageSize)||50,100)),page=Math.max(1,Number(payload.page)||1),start=(page-1)*size;return {items:items.slice(start,start+size),page:page,pageSize:size,total:items.length}}
