'use client';
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/**
 * Modal pəncərə (dizayn v2): 16px radius, başlıq 22px, istəyə görə başlıqdan əvvəl ikon dairəsi
 * (`icon` + `tone`: təhlükəli əməliyyat üçün qırmızı).
 */
export function DialogContent({
  className,
  children,
  title,
  description,
  icon,
  tone = 'default',
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  tone?: 'default' | 'danger';
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dlg-ov" />
      <DialogPrimitive.Content className={cn('dlg', className)} {...props}>
        {icon ? (
          <span className={cn('dlg-ic', tone === 'danger' && 'danger')} aria-hidden>
            {icon}
          </span>
        ) : null}
        <DialogPrimitive.Title className="dlg-title">{title}</DialogPrimitive.Title>
        {description ? (
          <DialogPrimitive.Description className="dlg-desc">
            {description}
          </DialogPrimitive.Description>
        ) : null}
        <div className="mt-5">{children}</div>
        <DialogPrimitive.Close className="dlg-x" aria-label="Bağla">
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
