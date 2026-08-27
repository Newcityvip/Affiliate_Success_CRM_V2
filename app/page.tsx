'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError('');
    const data = new FormData(event.currentTarget);
    try {
      const session = await api.login(String(data.get('username')), String(data.get('password')));
      localStorage.setItem('crm_session_token', session.token);
      localStorage.setItem('crm_user', JSON.stringify(session.user));
      router.push('/dashboard');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to sign in. Check the API configuration.');
    } finally { setBusy(false); }
  }

  return <main className="login-page">
    <section className="login-visual">
      <div className="logo-mark">AS</div>
      <div><span className="eyebrow">AFFILIATE OPERATIONS</span><h1>Turn every conversation<br/>into momentum.</h1>
      <p>A focused workspace for outreach, follow-ups, portfolio health and team execution.</p></div>
      <div className="secure-note">● Secure staff access · Session protected</div>
    </section>
    <section className="login-panel"><div className="login-box">
      <span className="eyebrow">WELCOME BACK</span><h2>Sign in to your workspace</h2><p className="muted">Use your staff credentials to continue.</p>
      <form onSubmit={submit} className="login-form">
        <label>Username<input name="username" required autoComplete="username" placeholder="Enter your username" /></label>
        <label>Password<input name="password" type="password" required autoComplete="current-password" placeholder="Enter your password" /></label>
        {error && <div className="error-message">{error}</div>}
        <button className="primary login-button" disabled={busy}>{busy ? 'Signing in…' : 'Sign in →'}</button>
      </form>
      <p className="login-help">Need access? Contact your CRM administrator.</p>
    </div></section>
  </main>;
}
