import type { ComponentProps } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { cn } from '@/lib/utils';

const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ['className', /^language-/]],
  },
};

type HeadingTag = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
const demote = (Tag: HeadingTag, level: number) =>
  function Heading({
    node: _node,
    className,
    ...props
  }: ComponentProps<'h2'> & { node?: unknown }) {
    return <Tag className={cn(`md-h${level}`, className)} {...props} />;
  };
/**
 * Səhifənin öz <h1>-i var (dərs / tapşırıq / kurs başlığı) — mətndəki başlıqlar bir pillə aşağı salınır ki,
 * səhifədə bir h1 qalsın və başlıq ardıcıllığı pozulmasın (# → h2, ## → h3 …). Görünüş .md-hN sinfi ilə eynidir.
 */
const headings: Components = {
  h1: demote('h2', 1),
  h2: demote('h3', 2),
  h3: demote('h4', 3),
  h4: demote('h5', 4),
  h5: demote('h6', 5),
  h6: demote('h6', 6),
};

/**
 * Markdown render. Nisbi yollar (images/foo.png) kursun fayl xəritəsinə görə /api/assets/... ünvanına çevrilir —
 * mətn ZIP-ə nisbi yolla saxlanılır, ixrac/idxal itkisiz olur.
 */
export function Markdown({
  content,
  assetMap = {},
  className,
  dark,
}: {
  content: string;
  assetMap?: Record<string, string>;
  className?: string;
  dark?: boolean;
}) {
  const urlTransform = (url: string) => {
    if (/^(https?:|mailto:|data:image\/|#|\/)/i.test(url)) return url;
    const clean = url.replace(/^\.?\//, '');
    return assetMap[clean] ?? url;
  };
  return (
    <div className={cn(dark ? 'ws-prose' : 'prose-light', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, schema]]}
        urlTransform={urlTransform}
        components={headings}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
