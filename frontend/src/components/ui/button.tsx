import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { cva, type VariantProps } from 'class-variance-authority';

const variants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[#2D6A4F] text-white hover:bg-[#40916C]',
        destructive: 'bg-[#E07A5F] text-white hover:bg-[#E07A5F]/90',
        outline: 'border border-[#D4C4A8] bg-white text-[#5C4033] hover:bg-[#E8DCC8] hover:text-[#5C4033]',
        ghost: 'text-[#5C4033] hover:bg-[#E8DCC8] hover:text-[#5C4033]',
      },
      size: { default: 'h-10 px-4 py-2', sm: 'h-9 px-3', lg: 'h-11 px-8', icon: 'h-10 w-10' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button className={cn(variants({ variant, size, className }))} ref={ref} {...props} />
));
Button.displayName = 'Button';
