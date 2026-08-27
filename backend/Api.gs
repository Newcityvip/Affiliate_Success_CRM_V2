function doGet(){return json_({ok:true,data:{service:'Affiliate Success CRM V2 API',status:'ready'}})}
function doPost(e){
  var request={};try{request=JSON.parse(e&&e.postData&&e.postData.contents||'{}');var data=route_(request);return json_({ok:true,data:data})}
  catch(err){return json_({ok:false,error:{code:err.code||'INTERNAL_ERROR',message:err.code?err.message:'Unexpected server error.'}})}
}
function route_(r){
  var action=String(r.action||''),p=r.payload||{};p.requestId=r.requestId||Utilities.getUuid();if(action==='login')return login_(p);
  var auth=sessionUser_(r.token),u=auth.staff;
  var publicActions={logout:function(){return logout_(r.token,u)},validateSession:function(){return {valid:true}},currentUser:function(){return publicUser_(u)},getMyWorkQueue:function(){return myWork_(u,p)},getAffiliate:function(){return affiliate_(u,p)},startWorkItem:function(){return startWork_(u,p)},recordContactAttempt:function(){return contact_(u,p)},recordTelegramConnected:function(){return telegram_(u,p)},completeWorkItem:function(){return completeWork_(u,p)},createFollowup:function(){return followup_(u,p)},logMeaningfulInteraction:function(){return interaction_(u,p)}};
  if(publicActions[action])return publicActions[action]();
  requireRole_(u,['ADMIN','SUPER_ADMIN']);var admin={listStaff:function(){return cacheRows_('Staff_List',300).map(publicUser_)},listBrands:function(){return cacheRows_('Brand_List',300)},validateBulkAffiliateImport:function(){return validateImport_(u,p)},importAffiliates:function(){return importAffiliates_(u,p)},assignAffiliates:function(){return assign_(u,p)},transferAffiliate:function(){return transfer_(u,p)},archiveAffiliate:function(){return archive_(u,p)},reopenAffiliate:function(){return reopen_(u,p)}};
  if(!admin[action])throw apiError_('UNKNOWN_ACTION','Unknown action: '+action);return admin[action]();
}
function json_(value){return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON)}
function apiError_(code,message){var e=new Error(message);e.code=code;return e}
