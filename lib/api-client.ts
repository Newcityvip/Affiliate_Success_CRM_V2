export type Role = 'STAFF' | 'SUPERVISOR' | 'ADMIN' | 'SUPER_ADMIN';
export type CurrentUser = { staffId: string; username: string; role: Role; team: string };
export type LoginResponse = { token: string; expiresAt: string; user: CurrentUser };

export class ApiError extends Error { constructor(message: string, public code = 'API_ERROR') { super(message); } }
type ApiEnvelope<T> = { ok: boolean; data?: T; error?: { code: string; message: string } };

class ApiClient {
  private baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  private token() { return typeof window === 'undefined' ? null : localStorage.getItem('crm_session_token'); }
  async call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
    if (!this.baseUrl) throw new ApiError('API URL is not configured.', 'NOT_CONFIGURED');
    const response = await fetch(this.baseUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, token: this.token(), payload }) });
    const result = await response.json() as ApiEnvelope<T>;
    if (!response.ok || !result.ok) throw new ApiError(result.error?.message ?? 'Request failed.', result.error?.code);
    return result.data as T;
  }
  login(username: string, password: string) { return this.call<LoginResponse>('login', { username, password }); }
  logout() { return this.call<void>('logout'); }
  validateSession() { return this.call<{ valid: boolean }>('validateSession'); }
  currentUser() { return this.call<CurrentUser>('currentUser'); }
  listStaff() { return this.call<unknown[]>('listStaff'); }
  listBrands() { return this.call<unknown[]>('listBrands'); }
  getMyWorkQueue(page = 1, pageSize = 50) { return this.call<unknown>('getMyWorkQueue', { page, pageSize }); }
  getAffiliate(affiliateId: string) { return this.call<unknown>('getAffiliate', { affiliateId }); }
  invoke<T>(action: string, payload: Record<string, unknown>) { return this.call<T>(action, payload); }
}
export const api = new ApiClient();
