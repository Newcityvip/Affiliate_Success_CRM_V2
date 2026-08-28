const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const owner='STF000004',other='STF000005',data={
  Staff_List:[{Staff_ID:owner,Username:'owner',Display_Name:'Owner Staff',Role:'STAFF'},{Staff_ID:other,Username:'other',Display_Name:'Other Staff',Role:'STAFF'}],
  Brand_List:[{Brand_ID:'BRD000001',Brand_Name:'Alpha Brand',Brand_Code:'ALPHA'}],
  Affiliates:[
    {Affiliate_ID:'AFF000001',Affiliate_Username:'kept.after.complete',Affiliate_Name:'Kept Affiliate',Email:'kept@example.com',Phone:'+94770000001',Telegram_Username:'kepttg',Preferred_Channel:'CALL',Brand_ID:'BRD000001',Lifecycle_Status:'ASSIGNED',Prospect_Status:'NEW',Telegram_Status:'CONNECTED',Priority:'HIGH',Archive_Status:'ACTIVE',Last_Contact_At:'2026-08-20T10:00:00.000Z'},
    {Affiliate_ID:'AFF000002',Affiliate_Username:'other.staff',Affiliate_Name:'Other Affiliate',Email:'other@example.com',Brand_ID:'BRD000001',Lifecycle_Status:'ASSIGNED',Prospect_Status:'NEW',Telegram_Status:'NOT_CONNECTED',Archive_Status:'ACTIVE'},
    {Affiliate_ID:'AFF000003',Affiliate_Username:'unassigned',Affiliate_Name:'Unassigned Affiliate',Email:'',Brand_ID:'BRD000001',Lifecycle_Status:'NEW',Prospect_Status:'NEW',Telegram_Status:'NOT_CONNECTED',Archive_Status:'ACTIVE'}
  ],
  Assignments:[
    {Assignment_ID:'ASN000001',Affiliate_ID:'AFF000001',Staff_ID:owner,Brand_ID:'BRD000001',Status:'ACTIVE'},
    {Assignment_ID:'ASN000002',Affiliate_ID:'AFF000002',Staff_ID:other,Brand_ID:'BRD000001',Status:'ACTIVE'},
    {Assignment_ID:'ASN999999',Affiliate_ID:'MISSING',Staff_ID:owner,Brand_ID:'BRD000001',Status:'ACTIVE'}
  ],
  Work_Items:[
    {Work_ID:'WRK000001',Affiliate_ID:'AFF000001',Assignment_ID:'ASN000001',Staff_ID:owner,Work_Type:'FIRST_CONTACT',Work_Channel:'CALL',Status:'COMPLETED',Title:'Initial affiliate contact',Assigned_At:'2026-08-19T10:00:00.000Z',Completed_At:'2026-08-20T10:00:00.000Z'},
    {Work_ID:'WRK000002',Affiliate_ID:'AFF000002',Assignment_ID:'ASN000002',Staff_ID:other,Work_Type:'FOLLOW_UP',Work_Channel:'CALL',Status:'PENDING',Title:'Follow up',Assigned_At:'2026-08-21T10:00:00.000Z',Due_At:'2026-08-30T10:00:00.000Z'}
  ],
  Contact_Attempts:[{Attempt_ID:'CAT000001',Affiliate_ID:'AFF000001',Attempt_At:'2026-08-20T10:00:00.000Z',Result:'CONNECTED',Channel:'CALL',Result_Detail:'Spoke to affiliate',Notes:'Good conversation'}],
  Interactions:[],Followups:[]
};
function apiError_(code,message){const error=new Error(message);error.code=code;return error}
const context={console,Date,String,Number,Math,isFinite,rows_:name=>data[name]||[],apiError_,page_:(items,p)=>({items:items.slice(0,p.pageSize||100),page:p.page||1,pageSize:p.pageSize||100,total:items.length})};vm.createContext(context);vm.runInContext(fs.readFileSync('backend/Services.gs','utf8'),context);vm.runInContext(fs.readFileSync('backend/Directory.gs','utf8'),context);
const staff=context.affiliateDirectory_({Staff_ID:owner,Role:'STAFF'},{staffId:other,pageSize:500});
assert.equal(staff.total,1);assert.equal(staff.items[0].affiliateId,'AFF000001');assert.equal(staff.items[0].activeWorkCount,0,'completed work must not remove a permanently assigned affiliate');assert.equal(staff.summary.telegramConnected,1);assert.equal(staff.summary.activeWork,0);
assert.equal(context.myWork_({Staff_ID:owner,Role:'STAFF'},{page:1,pageSize:100}).total,0,'completed affiliate must be absent from My Work');
const admin=context.affiliateDirectory_({Staff_ID:'STF000001',Role:'SUPER_ADMIN'},{pageSize:500});assert.equal(admin.total,3);assert.equal(admin.summary.activeWork,1);
const detail=context.affiliateDetail_({Staff_ID:owner,Role:'STAFF'},{affiliateId:'AFF000001'});assert.equal(detail.profile.affiliateUsername,'kept.after.complete');assert.equal(detail.profile.activeWorkCount,0);assert.ok(detail.recentActivity.some(e=>e.type==='CONTACT_ATTEMPT'));assert.ok(detail.recentActivity.some(e=>e.type==='WORK_ITEM'));
assert.throws(()=>context.affiliateDetail_({Staff_ID:owner,Role:'STAFF'},{affiliateId:'AFF000002'}),error=>error.code==='FORBIDDEN');
assert.ok(!JSON.stringify({staff,admin,detail}).match(/Password_Hash|Session_Token_Hash|passwordHash|sessionToken/i));
const page=fs.readFileSync('app/affiliates/page.tsx','utf8'),tool=fs.readFileSync('lib/external-tools.ts','utf8');
assert.match(tool,/^export const EMAIL_TOOL_URL='https:\/\/run\.247cs\.live\/run\/6a4b5de24c9b030606b281bf';\s*$/);assert.ok(!tool.includes('?'));
assert.match(page,/target="_blank" rel="noopener noreferrer"/);assert.match(page,/navigator\.clipboard\?\.writeText/);assert.match(page,/item\.email\?<a[^>]+href=\{EMAIL_TOOL_URL\}/);assert.match(page,/disabled>Send Email<\/button>/);assert.match(page,/api\.listAffiliates\(\)/);assert.match(page,/api\.getAffiliateDetail\(/);
const copyBlock=page.slice(page.indexOf('function CopyButton'),page.indexOf('function Status'));assert.ok(!copyBlock.includes('api.'),'copy actions must remain browser-local');
console.log('Affiliate directory and contact action scenarios passed');
