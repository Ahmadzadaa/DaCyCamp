'use client';
import * as React from 'react';
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

export const Dropdown = DropdownPrimitive.Root;
export const DropdownTrigger = DropdownPrimitive.Trigger;

/** Açılan menyu (dizayn v2): ağ kart, 14px radius, kölgə; elementlər ikon + mətn */
export function DropdownContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        sideOffset={6}
        align="end"
        className={cn('pop menu-pop min-w-52', className)}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}
export function DropdownItem({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Item>) {
  return <DropdownPrimitive.Item className={cn('menu-item', className)} {...props} />;
}
export const DropdownSeparator = (
  props: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Separator>,
) => <DropdownPrimitive.Separator className="menu-sep" {...props} />;
