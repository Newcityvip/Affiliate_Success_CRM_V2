/** Read-only validation of all 15 required sheets. */
function validateSpreadsheetSchema(){
  var ss=spreadsheet_(),result={ok:true,okSheets:[],missingSheets:[],headerMismatches:[],duplicateHeaders:[],missingRequiredColumns:[],unexpectedColumns:[]};
  Object.keys(SCHEMA).forEach(function(name){
    var expected=SCHEMA[name],s=ss.getSheetByName(name);if(!s){result.missingSheets.push(name);return}
    var width=Math.max(s.getLastColumn(),expected.length),actual=s.getRange(1,1,1,width).getDisplayValues()[0].map(function(x){return String(x).trim()});
    while(actual.length&&actual[actual.length-1]==='')actual.pop();var seen={};actual.forEach(function(h,i){if(h&&seen[h]!==undefined)result.duplicateHeaders.push({sheet:name,header:h,firstPosition:seen[h]+1,duplicatePosition:i+1});else if(h)seen[h]=i});
    expected.forEach(function(h,i){if(actual.indexOf(h)<0)result.missingRequiredColumns.push({sheet:name,header:h,expectedPosition:i+1});if(actual[i]!==h)result.headerMismatches.push({sheet:name,columnPosition:i+1,expectedHeader:h,actualHeader:actual[i]||''})});
    actual.forEach(function(h,i){if(h&&expected.indexOf(h)<0)result.unexpectedColumns.push({sheet:name,header:h,columnPosition:i+1})});
    if(actual.length===expected.length&&expected.every(function(h,i){return actual[i]===h}))result.okSheets.push(name);
  });
  result.ok=result.missingSheets.length===0&&result.headerMismatches.length===0&&result.duplicateHeaders.length===0&&result.missingRequiredColumns.length===0&&result.unexpectedColumns.length===0;return result;
}

/** Creates only missing sheets. Existing sheets and data are never modified. */
function setupSpreadsheet(){
  var before=validateSpreadsheetSchema();if(before.headerMismatches.length||before.duplicateHeaders.length||before.missingRequiredColumns.length||before.unexpectedColumns.length)throw new Error(schemaErrorMessage_(before));
  var ss=spreadsheet_(),created=[];before.missingSheets.forEach(function(name){var s=ss.insertSheet(name),headers=SCHEMA[name];s.getRange(1,1,1,headers.length).setValues([headers]);s.setFrozenRows(1);created.push(name)});
  var after=validateSpreadsheetSchema();if(!after.ok)throw new Error(schemaErrorMessage_(after));return {ok:true,createdSheets:created,untouchedSheets:after.okSheets.filter(function(name){return created.indexOf(name)<0})};
}
function schemaErrorMessage_(r){var parts=['Spreadsheet schema validation failed.'];r.headerMismatches.forEach(function(x){parts.push(x.sheet+' column '+x.columnPosition+': expected "'+x.expectedHeader+'", actual "'+x.actualHeader+'"')});r.duplicateHeaders.forEach(function(x){parts.push(x.sheet+': duplicate header "'+x.header+'" at column '+x.duplicatePosition)});r.unexpectedColumns.forEach(function(x){parts.push(x.sheet+': unexpected column "'+x.header+'" at position '+x.columnPosition)});r.missingRequiredColumns.forEach(function(x){parts.push(x.sheet+': missing required column "'+x.header+'"')});return parts.join('\n')}

/** Manual editor-only bootstrap. Never expose this through route_(). */
function createInitialSuperAdmin(username,password,displayName,email){
  username=String(username||'').trim();if(!username||!displayName||!email)throw new Error('Username, display name, and email are required.');
  var lock=LockService.getScriptLock();lock.waitLock(30000);var user;
  try{var staffRows=rows_('Staff_List'),active=staffRows.some(function(s){return s.Role==='SUPER_ADMIN'&&s.Status==='ACTIVE'});if(active)throw new Error('Bootstrap refused: an active SUPER_ADMIN already exists.');if(staffRows.some(function(s){return String(s.Username).toLowerCase()===username.toLowerCase()}))throw new Error('Bootstrap refused: username already exists.');var t=now_(),id=nextIdUnlocked_('Staff');user={Staff_ID:id,Username:username,Password_Hash:createPasswordHash(password),Display_Name:displayName,Email:email,Role:'SUPER_ADMIN',Team:'ADMIN',Status:'ACTIVE',Prospect_Target:config_('DEFAULT_PROSPECT_TARGET'),Max_Managed_Affiliates:'',Last_Login_At:'',Password_Changed_At:t,Created_At:t,Updated_At:t,Created_By:'SYSTEM_BOOTSTRAP',Updated_By:'SYSTEM_BOOTSTRAP'};appendRows_('Staff_List',[user])}finally{lock.releaseLock()}
  audit_(user,'BOOTSTRAP_SUPER_ADMIN','Staff',user.Staff_ID,'',null,{Staff_ID:user.Staff_ID,Username:user.Username,Role:user.Role},{details:'Initial Super Admin created from Apps Script editor',force:true});return {created:true,staffId:user.Staff_ID,username:user.Username};
}
