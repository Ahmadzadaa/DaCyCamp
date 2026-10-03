import type { MeSummaryDto } from '@dacy/shared';
import { AppShell } from '@/components/shell/app-shell';
import { apiTry, getCurrentUser } from '@/lib/api/server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const summary = user ? await apiTry<MeSummaryDto>('/me/summary') : null;
  return (
    <AppShell user={user} summary={summary}>
      {children}
    </AppShell>
  );
}
