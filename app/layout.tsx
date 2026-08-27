import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Affiliate Success CRM V2',
  description: 'Execution-first affiliate success operating system',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <div className="brand">Affiliate Success CRM V2</div>
            <nav className="nav">
              <Link href="/dashboard">Command Center</Link>
              <Link href="/my-work">My Work</Link>
              <Link href="/affiliates">Affiliates</Link>
              <Link href="/admin/import">Bulk Import</Link>
            </nav>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
