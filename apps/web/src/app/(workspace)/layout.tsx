export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ws h-dvh overflow-hidden" data-theme="dark">
      {children}
    </div>
  );
}
