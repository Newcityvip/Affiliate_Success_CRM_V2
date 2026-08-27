export type Role = 'STAFF' | 'SUPERVISOR' | 'ADMIN' | 'SUPER_ADMIN';
export type CurrentUser = { staffId: string; username: string; displayName: string; email: string; role: Role; team: string };
export type LoginResponse = { token: string; expiresAt: string; user: CurrentUser };

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
  listStaff() { return this.call<unknown[]>('listStaff'); }
  listBrands() { return this.call<unknown[]>('listBrands'); }
  getMyWork(page = 1, pageSize = 50) { return this.call<unknown>('getMyWork', { page, pageSize }); }
  getAffiliate(affiliateId: string) { return this.call<unknown>('getAffiliate', { affiliateId }); }
  invoke<T>(action: string, payload: Record<string, unknown>) { return this.call<T>(action, payload); }
}
export const api = new ApiClient();
