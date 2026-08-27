/** Canonical spreadsheet contract. Never use row numbers as domain identifiers. */
var SCHEMA = {
  Affiliates: ['Affiliate_ID','Username','Email','Phone','Brand_ID','Market','Lifecycle_Status','Archive_Reason','Import_Batch_ID','Created_At','Updated_At','Archived_At'],
  Staff_List: ['Staff_ID','Username','Password_Hash','Role','Team','Status','Created_At','Updated_At'],
  Brand_List: ['Brand_ID','Brand_Name','Status','Created_At','Updated_At'],
  Assignments: ['Assignment_ID','Affiliate_ID','Staff_ID','Assigned_By','Assigned_At','Ended_At','End_Reason','Status'],
  Work_Items: ['Work_Item_ID','Affiliate_ID','Assignment_ID','Staff_ID','Work_Type','Status','Priority','Due_At','Started_At','Completed_At','Outcome','Created_By','Created_At','Updated_At'],
  Contact_Attempts: ['Contact_Attempt_ID','Affiliate_ID','Work_Item_ID','Staff_ID','Channel','Outcome','Contacted_At','Notes','Created_At'],
  Interactions: ['Interaction_ID','Affiliate_ID','Staff_ID','Interaction_Type','Channel','Summary','Occurred_At','Created_At'],
  Followups: ['Followup_ID','Affiliate_ID','Staff_ID','Work_Item_ID','Due_At','Status','Reason','Completed_At','Created_At','Updated_At'],
  Issues: ['Issue_ID','Affiliate_ID','Staff_ID','Category','Severity','Status','Summary','Resolution','Opened_At','Resolved_At','Updated_At'],
  Monthly_Performance: ['Performance_ID','Affiliate_ID','Period','Clicks','Registrations','FTDs','Deposits','Net_Revenue','Currency','Source_Batch_ID','Created_At','Updated_At'],
  Import_Batches: ['Import_Batch_ID','File_Name','Brand_ID','Assigned_Staff_ID','Market','Total_Rows','New_Count','Existing_Count','Rejected_Count','Status','Imported_By','Created_At','Completed_At'],
  Audit_Log: ['Audit_ID','Actor_Staff_ID','Action','Entity_Type','Entity_ID','Before_JSON','After_JSON','Request_ID','Created_At'],
  Sessions: ['Session_ID','Staff_ID','Token_Hash','Expires_At','Revoked_At','Created_At','Last_Seen_At'],
  System_Config: ['Config_Key','Config_Value','Description','Updated_By','Updated_At']
};

var ID_PREFIX = { Affiliates:'AFF', Staff_List:'STF', Brand_List:'BRD', Assignments:'ASN', Work_Items:'WRK', Contact_Attempts:'CAT', Interactions:'INT', Followups:'FLW', Issues:'ISS', Monthly_Performance:'PRF', Import_Batches:'IMP', Audit_Log:'AUD', Sessions:'SES' };
var ROLES = ['STAFF','SUPERVISOR','ADMIN','SUPER_ADMIN'];
var WORK_STATUSES = ['PENDING','IN_PROGRESS','COMPLETED','SKIPPED','CANCELLED','OVERDUE'];
var LIFECYCLE = ['UNASSIGNED','ASSIGNED','CONTACT_PENDING','CONTACTING','CONNECTED','TELEGRAM_ONBOARDING','TELEGRAM_CONNECTED','MANAGED','RETRY','CALLBACK','CONTACT_EXHAUSTED','ARCHIVED','REPLACEMENT_REQUIRED'];
