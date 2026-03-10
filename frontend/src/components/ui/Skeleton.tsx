import { cn } from '@/lib/utils';

export interface SkeletonProps {
  className?: string;
}

function SkeletonBase({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-md bg-[var(--color-bg-tertiary)]',
        className,
      )}
    />
  );
}

/** Single text line skeleton */
export function SkeletonText({ className }: SkeletonProps) {
  return <SkeletonBase className={cn('h-4 w-full', className)} />;
}

/** Rectangular skeleton (e.g. card, image) */
export function SkeletonRect({ className }: SkeletonProps) {
  return <SkeletonBase className={cn('h-24 w-full rounded-lg', className)} />;
}

/** Circular skeleton (e.g. avatar) */
export function SkeletonCircle({ className }: SkeletonProps) {
  return <SkeletonBase className={cn('h-10 w-10 rounded-full', className)} />;
}

/** Generic skeleton — just the shimmer base */
export const Skeleton = SkeletonBase;
