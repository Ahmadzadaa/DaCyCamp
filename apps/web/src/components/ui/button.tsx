import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva('b', {
  variants: {
    variant: {
      brand: 'b-brand',
      dark: 'b-dark',
      ghost: 'b-ghost',
      run: 'b-run',
      danger: 'b-danger',
      hint: 'hintb',
    },
    size: { md: '', sm: 'b-sm', full: 'w-full' },
  },
  defaultVariants: { variant: 'brand', size: 'md' },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <span
              className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden
            />
            {children}
          </>
        ) : (
          // asChild (Slot) tək uşaq tələb edir — null belə sayılır, ona görə spinner yalnız loading-də render olunur
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';
export { buttonVariants };
