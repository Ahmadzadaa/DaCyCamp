import { Logo } from '@/components/app/logo';
import { ThemeToggle } from '@/components/app/theme-toggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-paper px-4 py-10">
      <div className="mb-6 flex w-full max-w-md items-center justify-between">
        <Logo text="DaCy Academy" className="text-ink" />
        <ThemeToggle className="rounded-md p-1.5 text-muted hover:text-ink" />
      </div>
      <div className="box w-full max-w-md p-7">{children}</div>
    </main>
  );
}
