import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode;
  footer?: ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ header, footer, className, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-sm',
        className,
      )}
      {...rest}
    >
      {header && (
        <div className="border-b border-[var(--color-border)] px-5 py-4">
          {typeof header === 'string' ? (
            <h3 className="text-base font-semibold text-[var(--color-text)]">
              {header}
            </h3>
          ) : (
            header
          )}
        </div>
      )}

      <div className="p-5">{children}</div>

      {footer && (
        <div className="border-t border-[var(--color-border)] px-5 py-4">
          {footer}
        </div>
      )}
    </div>
  ),
);

Card.displayName = 'Card';
