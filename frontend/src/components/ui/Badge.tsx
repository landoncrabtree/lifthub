import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const variantStyles = {
  default:
    'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]',
  success:
    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning:
    'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  danger:
    'bg-red-500/10 text-red-600 dark:text-red-400',
  info:
    'bg-brand-500/10 text-brand-600 dark:text-brand-400',
} as const;

export type BadgeVariant = keyof typeof variantStyles;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({
  variant = 'default',
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
