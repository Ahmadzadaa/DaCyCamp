'use client';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          unstyled: true,
          classNames: {
            toast: 'toast',
            title: 'font-bold',
            description: 'text-on-dark-muted text-sm',
          },
        }}
      />
    </ThemeProvider>
  );
}
