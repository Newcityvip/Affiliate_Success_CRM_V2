'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

const navigation = [
  ['Command Center', '/dashboard', '◫'], ['My Work', '/my-work', '✓'], ['Affiliates', '/affiliates', '♙'],
  ['Follow-ups', '/follow-ups', '↗'], ['Interactions', '/interactions', '◌'], ['Tasks', '/tasks', '□'],
  ['Issues', '/issues', '!'], ['Performance', '/performance', '⌁'], ['Intelligence', '/intelligence', '✦'],
  ['Team', '/team', '♚'], ['Reports', '/reports', '▥'], ['Admin', '/admin', '⚙'],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter();
  if (pathname === '/') return children;
  async function logout() { try { await api.logout(); } finally { localStorage.removeItem('crm_session_token'); localStorage.removeItem('crm_user'); router.push('/'); } }
  return <div className="shell"><aside className="sidebar">
    <div className="brand-row"><div className="logo-mark small">AS</div><div><strong>Affiliate Success</strong><span>CRM V2</span></div></div>
    <nav className="nav">{navigation.map(([label, href, icon]) => <Link className={pathname.startsWith(href) ? 'active' : ''} href={href} key={href}><i>{icon}</i>{label}</Link>)}</nav>
    <div className="profile"><div className="avatar">DU</div><div><strong>Demo User</strong><span>Sample profile</span></div><button onClick={logout} title="Sign out">↪</button></div>
  </aside><main className="main"><header className="topbar"><div><b>Operations workspace</b><span> / CRM V2</span></div><div className="top-actions"><span className="demo-pill">SAMPLE DATA</span><button>⌕</button><button>◔</button></div></header><div className="page-content">{children}</div></main></div>;
}
