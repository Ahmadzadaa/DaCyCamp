import { AppHeader } from '@/components/app/app-header';
import { getCurrentUser } from '@/lib/api/server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-6 md:px-[22px]">
        {children}
      </main>
      <footer className="px-4 py-6 text-center text-xs text-muted">
        © {new Date().getFullYear()} DaCy Academy
      </footer>
    </div>
  );
}
