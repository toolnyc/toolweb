import { cn } from '@/lib/utils';

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
}

export function Section({ children, className, ...props }: SectionProps) {
  return (
    <section className={cn('py-12 sm:py-16 lg:py-24', className)} {...props}>
      {children}
    </section>
  );
}
