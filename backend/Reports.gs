var REPORT_OPEN_WORK_={PENDING:true,IN_PROGRESS:true,OVERDUE:true};
var REPORT_OPEN_FOLLOWUP_={PENDING:true,OPEN:true,IN_PROGRESS:true,OVERDUE:true};
var REPORT_OPEN_TASK_={PENDING:true,IN_PROGRESS:true};
var REPORT_OPEN_ISSUE_={OPEN:true,IN_PROGRESS:true};
function reportsWorkspace_(user,p){
  var admin=['ADMIN','SUPER_ADMIN'].indexOf(String(user.Role))>=0;if(!admin)requireRole_(user,['STAFF']);
  var period=performancePeriod_(p.period),performance=performanceWorkspace_(user,{period:period,staffId:admin?p.staffId:'',teamId:admin?p.teamId:'',brandId:admin?p.brandId:''}),now=Date.now(),affiliateIds={},assignmentIds={},ownerByAffiliate={},operations={openWork:0,overdueWork:0,openFollowups:0,overdueFollowups:0,openTasks:0,overdueTasks:0,openIssues:0},staffOps={};
  performance.items.forEach(function(item){var key=performanceIdPart_(item.affiliateId),owner=performanceIdPart_(item.staffId);affiliateIds[key]=true;ownerByAffiliate[key]=owner;if(!staffOps[owner])staffOps[owner]={openWork:0,overdueWork:0,openFollowups:0,overdueFollowups:0,openTasks:0,overdueTasks:0,openIssues:0}});
  rows_('Assignments').forEach(function(row){var affiliateKey=performanceIdPart_(row.Affiliate_ID);if(String(row.Status).toUpperCase()==='ACTIVE'&&affiliateIds[affiliateKey]&&ownerByAffiliate[affiliateKey]===performanceIdPart_(row.Staff_ID))assignmentIds[performanceIdPart_(row.Assignment_ID)]=true});
  function scoped_(row){return affiliateIds[performanceIdPart_(row.Affiliate_ID)]&&assignmentIds[performanceIdPart_(row.Assignment_ID)]}
  function add_(affiliateId,key){operations[key]++;var owner=staffOps[ownerByAffiliate[performanceIdPart_(affiliateId)]];if(owner)owner[key]++}
  rows_('Work_Items').forEach(function(row){if(!scoped_(row)||!REPORT_OPEN_WORK_[String(row.Status).toUpperCase()])return;add_(row.Affiliate_ID,'openWork');if(intelligenceTime_(row.Due_At)<now)add_(row.Affiliate_ID,'overdueWork')});
  rows_('Followups').forEach(function(row){if(!scoped_(row)||!REPORT_OPEN_FOLLOWUP_[String(row.Status).toUpperCase()])return;add_(row.Affiliate_ID,'openFollowups');if(intelligenceTime_(row.Due_At)<now)add_(row.Affiliate_ID,'overdueFollowups')});
  rows_('Tasks').forEach(function(row){if(!scoped_(row)||!REPORT_OPEN_TASK_[String(row.Status).toUpperCase()])return;add_(row.Affiliate_ID,'openTasks');if(intelligenceTime_(row.Due_At)<now)add_(row.Affiliate_ID,'overdueTasks')});
  rows_('Issues').forEach(function(row){if(!affiliateIds[performanceIdPart_(row.Affiliate_ID)]||row.Assignment_ID&&!assignmentIds[performanceIdPart_(row.Assignment_ID)]||!REPORT_OPEN_ISSUE_[String(row.Status).toUpperCase()])return;add_(row.Affiliate_ID,'openIssues')});
  var summary=Object.assign({managedAffiliates:performance.summary.assignedAffiliates,performanceUpdated:performance.summary.updated,performanceMissing:performance.summary.notUpdated,performanceDataConflicts:performance.summary.dataConflicts,needAttention:performance.summary.needsAttention},operations);PERFORMANCE_SOURCE_KEYS_.forEach(function(key){summary[key]=performance.summary[key]});
  var staff=admin?performance.staff.map(function(row){var op=staffOps[performanceIdPart_(row.staffId)]||{};return Object.assign({},row,op,{ftdConversionRate:row.registeredUsers?row.ftd/row.registeredUsers*100:0,activePlayerRate:row.registeredUsers?row.activePlayers/row.registeredUsers*100:0})}):[];
  return {period:period,canManage:admin,summary:summary,affiliates:performance.items,staff:staff,options:performance.options};
}
