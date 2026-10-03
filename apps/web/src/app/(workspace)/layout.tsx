export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    // Oxu hissələri saytın mövzusuna (açıq/tünd) tabedir; redaktor/terminal tərəfi (.ws-right) həmişə tünddür
    <div className="ws h-dvh overflow-hidden">{children}</div>
  );
}
