import ReactMarkdown from 'react-markdown';
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
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
