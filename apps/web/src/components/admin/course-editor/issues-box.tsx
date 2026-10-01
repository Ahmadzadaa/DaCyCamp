import type { Issue } from '@dacy/shared';

/** Dərc/validasiya səhvləri — sarı qutu */
export function IssuesBox({ title, issues }: { title: string; issues: Issue[] }) {
  if (issues.length === 0) return null;
  return (
    <div role="alert" className="rounded-lg border border-de/50 bg-de/10 px-4 py-3 text-sm">
      <b>{title}</b>
      <ul className="mt-1 list-disc pl-5">
        {issues.map((i, n) => (
          <li key={`${i.path}-${n}`}>
            {i.path ? <code className="text-xs">{i.path}</code> : null}
            {i.path ? ' — ' : ''}
            {i.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
