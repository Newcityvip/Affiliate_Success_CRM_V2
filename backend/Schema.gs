/** Exact contract of the already-created CRM V2 spreadsheet. */
var SCHEMA = {
  Affiliates: ['Affiliate_ID','Affiliate_Username','Email','Phone','Brand_ID','Market','Country','Language','Affiliate_Name','Preferred_Channel','Telegram_Username','Telegram_Status','Lifecycle_Status','Health_Status','Priority','Prospect_Status','Archive_Status','Archive_Reason','First_Added_At','Last_Contact_At','Last_Meaningful_Contact_At','Telegram_Connected_At','Archived_At','Created_At','Updated_At','Created_By','Updated_By'],
  Staff_List: ['Staff_ID','Username','Password_Hash','Display_Name','Email','Role','Team','Status','Prospect_Target','Max_Managed_Affiliates','Last_Login_At','Password_Changed_At','Created_At','Updated_At','Created_By','Updated_By'],
  Brand_List: ['Brand_ID','Brand_Name','Brand_Code','Market','Default_Language','Status','Sort_Order','Created_At','Updated_At','Created_By','Updated_By'],
  Assignments: ['Assignment_ID','Affiliate_ID','Staff_ID','Brand_ID','Assignment_Type','Status','Assigned_At','Activated_At','Ended_At','End_Reason','Previous_Assignment_ID','Import_Batch_ID','Assigned_By','Created_At','Updated_At'],
  Work_Items: ['Work_ID','Affiliate_ID','Assignment_ID','Staff_ID','Work_Type','Work_Channel','Priority','Status','Title','Reason','Generated_By','Assigned_At','Due_At','Started_At','Completed_At','Outcome','Completion_Notes','Next_Action_At','SLA_Minutes','Escalation_Level','Is_Auto_Generated','Parent_Work_ID','Created_At','Updated_At'],
  Contact_Attempts: ['Attempt_ID','Affiliate_ID','Assignment_ID','Work_ID','Staff_ID','Attempt_Number','Channel','Contact_Value','Attempt_At','Result','Result_Detail','Connected','Meaningful_Contact','Callback_Required','Callback_At','Notes','Created_At','Created_By'],
  Interactions: ['Interaction_ID','Affiliate_ID','Assignment_ID','Staff_ID','Work_ID','Channel','Interaction_Type','Outcome','Notes','Interaction_At','Followup_Required','Followup_At','Issue_Created','Growth_Opportunity','Performance_Concern','Created_At','Created_By'],
  Followups: ['Followup_ID','Affiliate_ID','Assignment_ID','Staff_ID','Source_Interaction_ID','Source_Work_ID','Followup_Type','Priority','Status','Due_At','Reminder_At','Completed_At','Outcome','Notes','Created_At','Updated_At','Created_By'],
  Issues: ['Issue_ID','Affiliate_ID','Assignment_ID','Reported_By','Assigned_To','Brand_ID','Issue_Type','Priority','Status','Title','Description','Reported_At','Due_At','Resolved_At','Resolution','Escalation_Level','Source_Interaction_ID','Created_At','Updated_At'],
  Monthly_Performance: ['Performance_ID','Affiliate_ID','Brand_ID','Period','Year','Month','FTD','Active_Players','Registrations','Deposits_Count','Deposit_Amount','Turnover','Revenue_NGR','Commission','Conversion_Rate','Previous_FTD','FTD_Change_Percent','Previous_NGR','NGR_Change_Percent','Imported_At','Import_Batch_ID','Created_By'],
  Import_Batches: ['Import_Batch_ID','Import_Type','File_Name','Brand_ID','Assigned_Staff_ID','Market','Total_Rows','Valid_Rows','Imported_Rows','Duplicate_Rows','Existing_Rows','Invalid_Rows','Archived_Matches','Status','Started_At','Completed_At','Imported_By','Notes'],
  Audit_Log: ['Audit_ID','Timestamp','User_ID','Username','Role','Action','Entity_Type','Entity_ID','Affiliate_ID','Old_Value','New_Value','Details','IP_Address','Session_ID','Request_ID'],
  Sessions: ['Session_ID','User_ID','Session_Token_Hash','Created_At','Last_Seen_At','Expires_At','Revoked_At','Status','Login_IP','User_Agent'],
  System_Config: ['Config_Key','Config_Value','Value_Type','Category','Description','Is_Active','Updated_At','Updated_By'],
  ID_Counters: ['Entity','Prefix','Last_Number','Updated_At']
};

var ID_DEFINITIONS = {
  Affiliate:'AFF', Staff:'STF', Brand:'BRD', Assignment:'ASN', Work:'WRK', Attempt:'ATM',
  Interaction:'INT', Followup:'FUP', Issue:'ISS', Performance:'PRF', Import:'IMP', Audit:'AUD', Session:'SES'
};
var ID_SOURCES = {Affiliate:['Affiliates','Affiliate_ID'],Staff:['Staff_List','Staff_ID'],Brand:['Brand_List','Brand_ID'],Assignment:['Assignments','Assignment_ID'],Work:['Work_Items','Work_ID'],Attempt:['Contact_Attempts','Attempt_ID'],Interaction:['Interactions','Interaction_ID'],Followup:['Followups','Followup_ID'],Issue:['Issues','Issue_ID'],Performance:['Monthly_Performance','Performance_ID'],Import:['Import_Batches','Import_Batch_ID'],Audit:['Audit_Log','Audit_ID'],Session:['Sessions','Session_ID']};
var ROLES = ['STAFF','SUPERVISOR','ADMIN','SUPER_ADMIN'];
var WORK_STATUSES = ['PENDING','IN_PROGRESS','COMPLETED','SKIPPED','CANCELLED','OVERDUE'];
