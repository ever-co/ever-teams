import { cn } from '@ever-teams/toolkit-ui';
import { PropsWithChildren } from 'react';
import { GradientBackground } from '../backgrounds/gradient-background';

type BaseLayoutProps = PropsWithChildren<{
  className?: string;
  contentClassName?: string;
}>;

export function BaseLayout({ children, className, contentClassName }: BaseLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-[#0A0A0C] dark:to-[#0A0A0C] relative overflow-hidden">
      <GradientBackground />

      <div className={cn("relative z-10 min-h-screen", className)}>
        <div className={cn("w-full", contentClassName)}>
          {children}
        </div>
      </div>
    </div>
  );
}
