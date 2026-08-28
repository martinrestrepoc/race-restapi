import { cx } from '@/lib/cx';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cx('block animate-pulse rounded bg-secondary', className)}
    />
  );
}
