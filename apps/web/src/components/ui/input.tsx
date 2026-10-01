import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <input
    ref={ref}
    className={cn('inp', invalid && 'err', className)}
    aria-invalid={invalid || undefined}
    {...props}
  />
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean; code?: boolean }
>(({ className, invalid, code, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn('inp', code && 'code', invalid && 'err', className)}
    aria-invalid={invalid || undefined}
    spellCheck={code ? false : undefined}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn('inp', className)} {...props} />
));
Select.displayName = 'Select';
