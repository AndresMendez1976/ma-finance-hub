import { cn } from '@/lib/cn';
import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return <div className="relative w-full overflow-auto"><table className={cn('w-full caption-bottom text-sm', className)} {...props} /></div>;
}
export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('[&_tr]:border-b [&_tr]:border-[#E8DCC8]', className)} {...props} />;
}
export function TBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}
export function TR({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('border-b border-[#E8DCC8] transition-colors hover:bg-[#E8DCC8]/30', className)} {...props} />;
}
export function TH({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('h-12 px-4 text-left align-middle font-medium text-[#8B7355] bg-[#E8DCC8]/40', className)} {...props} />;
}
export function TD({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('p-4 align-middle', className)} {...props} />;
}
