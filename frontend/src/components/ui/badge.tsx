import { cn } from '@/lib/cn';
import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

const variants = cva('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', {
  variants: {
    variant: {
      default: 'border-transparent bg-primary text-primary-foreground',
      secondary: 'border-transparent bg-muted text-muted-foreground',
      destructive: 'border-transparent bg-[#E07A5F] text-white',
      outline: 'border-[#D4C4A8] text-foreground',
      success: 'border-transparent bg-[#2D6A4F] text-white',
      warning: 'border-transparent bg-[#D4A854] text-[#5C4033]',
      info: 'border-transparent bg-[#B4D4E7] text-[#5C4033]',
    },
  },
  defaultVariants: { variant: 'default' },
});

export function Badge({ className, variant, ...props }: HTMLAttributes<HTMLDivElement> & VariantProps<typeof variants>) {
  return <div className={cn(variants({ variant }), className)} {...props} />;
}
