'use client';
import * as React from 'react';
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

export const Dropdown = DropdownPrimitive.Root;
export const DropdownTrigger = DropdownPrimitive.Trigger;
export function DropdownContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        sideOffset={6}
        align="end"
        className={cn(
          'z-50 min-w-44 rounded-[10px] border border-line bg-card p-1 text-ink shadow-xl',
          className,
        )}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}
export function DropdownItem({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Item>) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm outline-none hover:bg-paper focus:bg-paper',
        className,
      )}
      {...props}
    />
  );
}
export const DropdownSeparator = (
  props: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Separator>,
) => <DropdownPrimitive.Separator className="my-1 h-px bg-line" {...props} />;
