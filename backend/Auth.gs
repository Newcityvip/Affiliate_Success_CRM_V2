function digest_(value){return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,value,Utilities.Charset.UTF_8)).replace(/=+$/,'')}
function passwordHash_(password,salt,rounds){rounds=rounds||25000;return 'pbkdf2-sha256$'+rounds+'$'+salt+'$'+pbkdf2_(String(password),salt,rounds)}
function pbkdf2_(password,salt,rounds){var key=Utilities.newBlob(password).getBytes(),u=Utilities.computeHmacSha256Signature(Utilities.newBlob(salt+'\u0000\u0000\u0000\u0001').getBytes(),key),out=u.slice();for(var i=1;i<rounds;i++){u=Utilities.computeHmacSha256Signature(u,key);for(var j=0;j<out.length;j++)out[j]=out[j]^u[j]}return Utilities.base64EncodeWebSafe(out).replace(/=+$/,'')}
function verifyPassword_(password,stored){var p=String(stored).split('$');if(p.length!==4||p[0]!=='pbkdf2-sha256')return false;return constantTime_(passwordHash_(password,p[2],Number(p[1])),stored)}
function constantTime_(a,b){a=String(a);b=String(b);var mismatch=a.length^b.length,max=Math.max(a.length,b.length);for(var i=0;i<max;i++)mismatch|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return mismatch===0}
function createPasswordHash(password){if(String(password).length<12)throw new Error('Password must contain at least 12 characters.');return passwordHash_(String(password),Utilities.getUuid().replace(/-/g,''),25000)}
function randomToken_(){return [Utilities.getUuid(),Utilities.getUuid(),Utilities.getUuid(),Utilities.getUuid()].join('').replace(/-/g,'')}

function login_(payload){
  var username=String(payload.username||'').trim().toLowerCase(),cache=CacheService.getScriptCache(),attemptKey='login-fail:'+digest_(username).slice(0,24),failures=Number(cache.get(attemptKey)||0),max=Number(config_('MAX_LOGIN_ATTEMPTS'));
  if(failures>=max)throw apiError_('LOGIN_LIMITED','Unable to sign in. Try again later.');
  var staff=rows_('Staff_List').filter(function(x){return String(x.Username).toLowerCase()===username&&x.Status==='ACTIVE'})[0],valid=false;
  if(staff)valid=verifyPassword_(String(payload.password||''),staff.Password_Hash);else passwordHash_(String(payload.password||''),'00000000000000000000000000000000',25000);
  if(!valid){cache.put(attemptKey,String(failures+1),900);throw apiError_('INVALID_CREDENTIALS','Invalid username or password.')}
  cache.remove(attemptKey);if(ROLES.indexOf(staff.Role)<0)throw apiError_('INVALID_CREDENTIALS','Invalid username or password.');
  var token=randomToken_(),created=now_(),hours=Math.max(1,Math.min(Number(config_('SESSION_HOURS')),168)),expires=new Date(Date.now()+hours*60*60*1000).toISOString(),sessionId=nextId('Session');
  appendRows_('Sessions',[{Session_ID:sessionId,User_ID:staff.Staff_ID,Session_Token_Hash:digest_(token),Created_At:created,Last_Seen_At:created,Expires_At:expires,Revoked_At:'',Status:'ACTIVE',Login_IP:'',User_Agent:String(payload.userAgent||'').slice(0,500)}]);
  updateById_('Staff_List','Staff_ID',staff.Staff_ID,{Last_Login_At:created,Updated_At:created,Updated_By:staff.Staff_ID});audit_(staff,'LOGIN','Session',sessionId,'',null,{Expires_At:expires},{sessionId:sessionId,requestId:payload.requestId});return {token:token,expiresAt:expires,user:publicUser_(staff)};
}
function sessionUser_(token){
  if(!token)throw apiError_('UNAUTHENTICATED','Authentication required.');var hash=digest_(token),now=Date.now(),session=rows_('Sessions').filter(function(x){return x.Session_Token_Hash===hash&&x.Status==='ACTIVE'&&!x.Revoked_At&&new Date(x.Expires_At).getTime()>now})[0];
  if(!session)throw apiError_('SESSION_EXPIRED','Session is invalid or expired.');var staff=rows_('Staff_List').filter(function(x){return x.Staff_ID===session.User_ID&&x.Status==='ACTIVE'&&ROLES.indexOf(x.Role)>=0})[0];if(!staff)throw apiError_('FORBIDDEN','Access denied.');
  if(!session.Last_Seen_At||now-new Date(session.Last_Seen_At).getTime()>300000)updateById_('Sessions','Session_ID',session.Session_ID,{Last_Seen_At:now_()});return {staff:staff,session:session};
}
function requireRole_(user,roles){if(roles.indexOf(user.Role)<0)throw apiError_('FORBIDDEN','You do not have permission for this action.')}
function publicUser_(u){return {staffId:u.Staff_ID,username:u.Username,displayName:u.Display_Name,email:u.Email,role:u.Role,team:u.Team}}
function logout_(token,user,session,requestId){if(session)updateById_('Sessions','Session_ID',session.Session_ID,{Revoked_At:now_(),Status:'REVOKED'});audit_(user,'LOGOUT','Session',session&&session.Session_ID||'','',null,{Status:'REVOKED'},{sessionId:session&&session.Session_ID||'',requestId:requestId});return {loggedOut:true}}
