/** Admin səhifə başlığı (dizayn v2): 40px başlıq, alt mətn, sağda əsas düymələr */
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="ph1">
      <div className="min-w-0">
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {children ? <div className="ph1-act">{children}</div> : null}
    </div>
  );
}
