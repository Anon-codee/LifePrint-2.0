
import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type DivProps = HTMLAttributes<HTMLDivElement>;
type HeadingProps = HTMLAttributes<HTMLHeadingElement>;

export function Card({
  className,
  children,
  ...props
}: DivProps) {
  return (
    <div
      className={cn(
        'lp-card overflow-hidden transition-colors duration-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: DivProps) {
  return (
    <div
      className={cn('p-6 pb-4', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: HeadingProps) {
  return (
    <h3
      className={cn(
        'text-lg font-semibold leading-tight tracking-tight text-[#263a30]',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: DivProps) {
  return (
    <div
      className={cn('p-6 pt-0', className)}
      {...props}
    >
      {children}
    </div>
  );
}