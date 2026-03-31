import { cn } from '@/lib/cn';
import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

const variants = cva('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', {
  variants: {
    variant: {
      default: 'border-transparent bg-primary text-primary-foreground',
      secondary: 'border-transparent bg-muted text-muted-foreground',
      destructive: 'border-transparent bg-destructive text-destructive-foreground',
      outline: 'text-foreground',
      success: 'border-transparent bg-green-100 text-green-800',
      warning: 'border-transparent bg-yellow-100 text-yellow-800',
    },
  },
  defaultVariants: { variant: 'default' },
});

export function Badge({ className, variant, ...props }: HTMLAttributes<HTMLDivElement> & VariantProps<typeof variants>) {
  return <div className={cn(variants({ variant }), className)} {...props} />;
}
