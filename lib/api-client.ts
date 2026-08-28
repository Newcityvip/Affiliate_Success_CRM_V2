export type Role = 'STAFF' | 'SUPERVISOR' | 'ADMIN' | 'SUPER_ADMIN';
export type CurrentUser = { staffId: string; username: string; displayName: string; email: string; role: Role; team: string };
export type LoginResponse = { token: string; expiresAt: string; user: CurrentUser };
export type StaffRecord = CurrentUser & { status: 'ACTIVE'|'INACTIVE'|'SUSPENDED'; prospectTarget: number; maxManagedAffiliates: number; createdAt: string; updatedAt: string; lastLoginAt: string; passwordChangedAt: string };
export type TeamRecord = { teamId:string; teamName:string; teamCode:string; status:'ACTIVE'|'INACTIVE'; defaultProspectTarget:number; defaultMaxManagedAffiliates:number; createdAt:string; updatedAt:string };
export type BrandRecord = { brandId:string; brandName:string; brandCode:string; market:string; defaultLanguage:string; status:'ACTIVE'|'INACTIVE'; sortOrder:number; createdAt:string; updatedAt:string };
export type ImportInputRow = { username:string; fullName:string; email:string; phone:string };
export type ImportValidation = { configuration:{brandId:string;brandName:string;brandCode:string;destination:'STAFF'|'POOL';staffId:string;staffName:string;mode:'NEW_PROSPECTS'};summary:{totalRows:number;validRows:number;invalidRows:number;existingAffiliates:number;duplicateRows:number;duplicateUsernames:number;duplicateEmails:number;duplicatePhones:number;missingContact:number;invalidContactFormat:number;existingActiveAssignment:number;archivedMatches:number};rows:Array<ImportInputRow&{row:number;status:'VALID'|'INVALID';reasons:string[]}>;limit:number };
export type ImportCommitResult = { importBatchId:string; importedAffiliates:number; assignmentsCreated:number; workItemsCreated:number; poolRowsAdded:number; skippedRows:number; invalidRows:number };
export type MyWorkItem = { workId:string;affiliateId:string;assignmentId:string;workType:string;workChannel:string;priority:string;status:string;title:string;reason:string;assignedAt:string;dueAt:string;startedAt:string;overdue:boolean;affiliateUsername:string;affiliateName:string;email:string;phone:string;brandId:string;brandName:string;brandCode:string;lifecycleStatus:string;prospectStatus:string;telegramStatus:string };
export type MyWorkResponse = { items:MyWorkItem[];page:number;pageSize:number;total:number };
export type WorkWorkspace = { work:{workId:string;affiliateId:string;assignmentId:string;workType:string;workChannel:string;priority:string;status:string;title:string;reason:string;assignedAt:string;dueAt:string;startedAt:string};affiliate:{affiliateUsername:string;affiliateName:string;email:string;phone:string;telegramUsername:string;preferredChannel:string;lifecycleStatus:string;prospectStatus:string;telegramStatus:string};brand:{brandId:string;brandName:string;brandCode:string};assignment:{staffId:string;staffName:string;status:string} };
export type WorkWorkspaceBootstrap = {workspace:WorkWorkspace;detail:AffiliateDetailResponse};
export type FirstContactResult = { workId:string;affiliateId:string;assignmentId:string;outcome:string;attemptId:string;interactionId:string;nextWorkId:string;followupId:string;completedAt:string };
export type AffiliateDirectoryItem = { affiliateId:string;affiliateUsername:string;affiliateName:string;email:string;phone:string;telegramUsername:string;preferredChannel:string;brandId:string;brandName:string;brandCode:string;lifecycleStatus:string;prospectStatus:string;telegramStatus:string;priority:string;archiveStatus:string;assignedStaffId:string;assignedStaffName:string;assignmentId:string;lastContactAt:string;lastMeaningfulContactAt:string;activeWorkCount:number;currentWorkId:string;currentWorkType:string;currentWorkDueAt:string };
export type AffiliateDirectoryResponse = { items:AffiliateDirectoryItem[];page:number;pageSize:number;total:number;summary:{totalAffiliates:number;telegramConnected:number;activeProspects:number;activeWork:number} };
export type AffiliateActivity = { id:string;type:string;timestamp:string;status:string;channel:string;summary:string;notes:string };
export type AffiliateDetailResponse = { profile:AffiliateDirectoryItem;recentActivity:AffiliateActivity[] };
export type FollowupItem = { followupId:string;affiliateId:string;assignmentId:string;staffId:string;affiliateUsername:string;affiliateName:string;brandId:string;brandName:string;brandCode:string;followupType:string;channel:string;status:string;dueAt:string;priority:string;title:string;reason:string;notes:string;sourceWorkId:string;linkedWorkId:string;email:string;phone:string;telegramUsername:string;telegramStatus:string;overdue:boolean;dueToday:boolean;upcoming:boolean };
export type FollowupsResponse = { items:FollowupItem[];page:number;pageSize:number;total:number;summary:{open:number;overdue:number;dueToday:number;upcoming:number} };

export class ApiError extends Error { constructor(message: string, public code = 'API_ERROR') { super(message); } }
type ApiEnvelope<T> = { ok: boolean; data?: T; error?: { code: string; message: string } };

class ApiClient {
  private baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  private timeoutMs = 30_000;
  private token() { return typeof window === 'undefined' ? null : localStorage.getItem('crm_session_token'); }
  async call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
    if (!this.baseUrl) throw new ApiError('API URL is not configured.', 'NOT_CONFIGURED');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(this.baseUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, token: this.token(), payload }), signal: controller.signal });
      const result = await response.json() as ApiEnvelope<T>;
      if (!response.ok || !result.ok) throw new ApiError(result.error?.message ?? 'Request failed.', result.error?.code);
      return result.data as T;
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') throw new ApiError('The request timed out. Please try again.', 'REQUEST_TIMEOUT');
      throw cause;
    } finally { window.clearTimeout(timeout); }
  }
  login(username: string, password: string) { return this.call<LoginResponse>('login', { username, password, userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent }); }
  logout() { return this.call<void>('logout'); }
  validateSession() { return this.call<{ valid: boolean }>('validateSession'); }
  currentUser() { return this.call<CurrentUser>('currentUser'); }
  listStaff() { return this.call<StaffRecord[]>('listStaff'); }
  createStaff(payload: Record<string, unknown>) { return this.call<StaffRecord>('createStaff', payload); }
  updateStaff(payload: Record<string, unknown>) { return this.call<StaffRecord>('updateStaff', payload); }
  setStaffStatus(staffId:string,status:StaffRecord['status']) { return this.call<StaffRecord>('setStaffStatus', {staffId,status}); }
  resetStaffPassword(staffId:string,newPassword:string) { return this.call<{staffId:string;sessionsRevoked:number}>('resetStaffPassword', {staffId,newPassword}); }
  listTeams() { return this.call<TeamRecord[]>('listTeams'); }
  createTeam(payload: Record<string, unknown>) { return this.call<TeamRecord>('createTeam', payload); }
  updateTeam(payload: Record<string, unknown>) { return this.call<TeamRecord>('updateTeam', payload); }
  listBrands() { return this.call<BrandRecord[]>('listBrands'); }
  createBrand(payload: Record<string, unknown>) { return this.call<BrandRecord>('createBrand', payload); }
  updateBrand(payload: Record<string, unknown>) { return this.call<BrandRecord>('updateBrand', payload); }
  validateAffiliateImport(payload: Record<string, unknown>) { return this.call<ImportValidation>('validateAffiliateImport', payload); }
  commitAffiliateImport(payload: Record<string, unknown>) { return this.call<ImportCommitResult>('commitAffiliateImport', payload); }
  getMyWork(page = 1, pageSize = 100) { return this.call<MyWorkResponse>('getMyWork', { page, pageSize }); }
  getMyFollowups(page = 1, pageSize = 200) { return this.call<FollowupsResponse>('getMyFollowups', {page,pageSize}); }
  listAffiliates(page = 1, pageSize = 500) { return this.call<AffiliateDirectoryResponse>('listAffiliates', {page,pageSize}); }
  getAffiliateDetail(affiliateId:string) { return this.call<AffiliateDetailResponse>('getAffiliateDetail', {affiliateId}); }
  getWorkWorkspace(workId:string) { return this.call<WorkWorkspace>('getWorkWorkspace', {workId}); }
  getWorkWorkspaceBootstrap(workId:string) { return this.call<WorkWorkspaceBootstrap>('getWorkWorkspaceBootstrap', {workId}); }
  submitFirstContactOutcome(payload:Record<string,unknown>) { return this.call<FirstContactResult>('submitFirstContactOutcome', payload); }
  submitCallbackOutcome(payload:Record<string,unknown>) { return this.call<FirstContactResult>('submitCallbackOutcome', payload); }
  getAffiliate(affiliateId: string) { return this.call<unknown>('getAffiliate', { affiliateId }); }
  invoke<T>(action: string, payload: Record<string, unknown>) { return this.call<T>(action, payload); }
}
export const api = new ApiClient();
