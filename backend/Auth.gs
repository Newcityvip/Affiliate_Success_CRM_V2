function digest_(value){return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,value,Utilities.Charset.UTF_8)).replace(/=+$/,'')}
function passwordHash_(password,salt,rounds){rounds=rounds||25000;return 'pbkdf2-sha256$'+rounds+'$'+salt+'$'+pbkdf2_(String(password),salt,rounds)}
function pbkdf2_(password,salt,rounds){
  var key=Utilities.newBlob(password).getBytes(),u=Utilities.computeHmacSha256Signature(Utilities.newBlob(salt+'\u0000\u0000\u0000\u0001').getBytes(),key),out=u.slice();
  for(var i=1;i<rounds;i++){u=Utilities.computeHmacSha256Signature(u,key);for(var j=0;j<out.length;j++)out[j]=(out[j]^u[j]);}
  return Utilities.base64EncodeWebSafe(out).replace(/=+$/,'');
}
function verifyPassword_(password,stored){var p=String(stored).split('$');if(p.length!==4||p[0]!=='pbkdf2-sha256')return false;return constantTime_(passwordHash_(password,p[2],Number(p[1])),stored)}
function constantTime_(a,b){a=String(a);b=String(b);var mismatch=a.length^b.length;for(var i=0;i<Math.max(a.length,b.length);i++)mismatch|=(a.charCodeAt(i%a.length)||0)^(b.charCodeAt(i%b.length)||0);return mismatch===0}
function createPasswordHash(password){if(String(password).length<12)throw new Error('Use at least 12 characters.');return passwordHash_(String(password),Utilities.getUuid().replace(/-/g,''),25000)}
function login_(payload){
  var username=String(payload.username||'').trim().toLowerCase(), staff=rows_('Staff_List').filter(function(x){return String(x.Username).toLowerCase()===username&&x.Status==='ACTIVE'})[0];
  if(!staff||!verifyPassword_(String(payload.password||''),staff.Password_Hash))throw apiError_('INVALID_CREDENTIALS','Invalid username or password.');
  var token=Utilities.getUuid()+Utilities.getUuid(),created=now_(),expires=new Date(Date.now()+8*60*60*1000).toISOString();
  appendRows_('Sessions',[{Session_ID:newId_('Sessions'),Staff_ID:staff.Staff_ID,Token_Hash:digest_(token),Expires_At:expires,Revoked_At:'',Created_At:created,Last_Seen_At:created}]);
  audit_(staff,'LOGIN','Session','',null,{expiresAt:expires},payload.requestId);
  return {token:token,expiresAt:expires,user:publicUser_(staff)};
}
function sessionUser_(token){
  if(!token)throw apiError_('UNAUTHENTICATED','Authentication required.');var hash=digest_(token),now=Date.now();
  var session=rows_('Sessions').filter(function(x){return x.Token_Hash===hash&&!x.Revoked_At&&new Date(x.Expires_At).getTime()>now})[0];
  if(!session)throw apiError_('SESSION_EXPIRED','Session is invalid or expired.');
  var staff=rows_('Staff_List').filter(function(x){return x.Staff_ID===session.Staff_ID&&x.Status==='ACTIVE'})[0];if(!staff)throw apiError_('FORBIDDEN','Account is inactive.');return {staff:staff,session:session};
}
function requireRole_(user,roles){if(roles.indexOf(user.Role)<0)throw apiError_('FORBIDDEN','You do not have permission for this action.')}
function publicUser_(u){return {staffId:u.Staff_ID,username:u.Username,role:u.Role,team:u.Team}}
function logout_(token,user){var hash=digest_(token),s=rows_('Sessions').filter(function(x){return x.Token_Hash===hash})[0];if(s)updateById_('Sessions','Session_ID',s.Session_ID,{Revoked_At:now_()});audit_(user,'LOGOUT','Session',s&&s.Session_ID,null,null,'');return {loggedOut:true}}
