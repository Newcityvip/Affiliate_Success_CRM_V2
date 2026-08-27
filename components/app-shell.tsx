'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import type { CurrentUser } from '@/lib/api-client';

const navigation = [
  ['Command Center','/dashboard','◫'],['My Work','/my-work','✓'],['Affiliates','/affiliates','♙'],['Follow-ups','/follow-ups','↗'],
  ['Interactions','/interactions','◌'],['Tasks','/tasks','□'],['Issues','/issues','!'],['Performance','/performance','⌁'],
  ['Intelligence','/intelligence','✦'],['Team','/team','♚'],['Reports','/reports','▥'],['Admin','/admin','⚙'],
] as const;

export function AppShell({children}:{children:React.ReactNode}) {
  const pathname=usePathname(); const router=useRouter(); const [user,setUser]=useState<CurrentUser|null>(null);
  useEffect(()=>{if(pathname==='/')return;const token=localStorage.getItem('crm_session_token'),saved=localStorage.getItem('crm_user');if(!token||!saved){router.replace('/');return}try{setUser(JSON.parse(saved) as CurrentUser)}catch{localStorage.removeItem('crm_user');router.replace('/')}},[pathname,router]);
  if(pathname==='/')return children;
  async function logout(){try{await api.logout()}finally{localStorage.removeItem('crm_session_token');localStorage.removeItem('crm_user');router.replace('/')}}
  return <div className="shell"><aside className="sidebar"><div className="brand-row"><div className="logo-mark small">AS</div><div><strong>Affiliate Success</strong><span>CRM V2</span></div></div>
    <nav className="nav">{navigation.map(([label,href,icon])=><Link className={pathname.startsWith(href)?'active':''} href={href} key={href}><i>{icon}</i>{label}</Link>)}</nav>
    <div className="profile"><div className="avatar">{initials_(user)}</div><div><strong>{user?.displayName||user?.username||'Signed-in user'}</strong><span>{user?.role?user.role.replace('_',' '):'Loading profile…'}</span></div><button onClick={logout} title="Sign out">↪</button></div>
  </aside><main className="main"><header className="topbar"><div><b>Operations workspace</b><span> / CRM V2</span></div></header><div className="page-content">{children}</div></main></div>;
}
function initials_(user:CurrentUser|null){const value=user?.displayName||user?.username||'';return value.split(/\s+/).filter(Boolean).slice(0,2).map((part)=>part[0]).join('').toUpperCase()||'U'}
