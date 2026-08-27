var CONFIG_DEFAULTS={
  DEFAULT_PROSPECT_TARGET:50,MAX_CONTACT_ATTEMPTS:5,FIRST_CONTACT_SLA_HOURS:24,CALL_RETRY_HOURS:24,CALLBACK_GRACE_MINUTES:15,
  TELEGRAM_ONBOARDING_SLA_HOURS:24,HEALTHY_CHECKIN_DAYS:14,WATCH_CHECKIN_DAYS:7,AT_RISK_CHECKIN_DAYS:3,DORMANT_DAYS:30,
  NO_CONTACT_WARNING_DAYS:14,AT_RISK_FTD_DROP_PERCENT:30,CRITICAL_FTD_DROP_PERCENT:60,AUTO_REPLACEMENT_ENABLED:false,
  AUTO_GENERATE_WORK:false,REQUIRE_CLOSE_APPROVAL:true,SESSION_HOURS:8,MAX_LOGIN_ATTEMPTS:5,AUDIT_ENABLED:true
};
function config_(key){
  if(!Object.prototype.hasOwnProperty.call(CONFIG_DEFAULTS,key))throw new Error('Unknown config key: '+key);
  var found=cacheRows_('System_Config',120).filter(function(r){return r.Config_Key===key&&String(r.Is_Active).toUpperCase()!=='FALSE'})[0];
  return found?parseConfig_(found.Config_Value,found.Value_Type,CONFIG_DEFAULTS[key]):CONFIG_DEFAULTS[key];
}
function parseConfig_(value,type,fallback){type=String(type||'').toUpperCase();if(type==='BOOLEAN'||typeof fallback==='boolean')return String(value).toUpperCase()==='TRUE';if(type==='NUMBER'||typeof fallback==='number'){var n=Number(value);return isFinite(n)?n:fallback}return value}
/** Adds only absent defaults. It never changes an existing administrator value. */
function addMissingSystemConfigDefaults(){
  var existing=rows_('System_Config'),present={};existing.forEach(function(r){present[r.Config_Key]=true});var created=[];
  Object.keys(CONFIG_DEFAULTS).forEach(function(key){if(!present[key])created.push({Config_Key:key,Config_Value:String(CONFIG_DEFAULTS[key]),Value_Type:typeof CONFIG_DEFAULTS[key]==='boolean'?'BOOLEAN':'NUMBER',Category:'SYSTEM',Description:'Code default; review before production use',Is_Active:'TRUE',Updated_At:now_(),Updated_By:'SYSTEM'})});
  appendRows_('System_Config',created);return {created:created.map(function(x){return x.Config_Key}),preserved:existing.map(function(x){return x.Config_Key})};
}
