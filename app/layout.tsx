import './globals.css';
import { AppShell } from '@/components/app-shell';

export const metadata = {
  title: 'Affiliate Success CRM V2',
  description: 'Execution-first affiliate success operating system',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
