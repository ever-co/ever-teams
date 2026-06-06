import { cn } from '@ever-teams/toolkit-ui';

export function GradientBackground() {
    return (
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.05),rgba(59,130,246,0.08))] dark:bg-none" />
        
        {/* Dark theme effects */}
        <div className={cn(
          "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
          "w-[1000px] h-[1000px] hidden dark:block",
          "bg-[#462961]/20 rounded-full blur-[150px] animate-pulse-slow"
        )} />
        <div className={cn(
          "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
          "w-[800px] h-[800px] hidden dark:block",
          "bg-[#8B5CF6]/10 rounded-full blur-[120px] animate-pulse-slow delay-300"
        )} />
        
        {/* Light theme effects */}
        <div className={cn(
          "absolute bottom-[-10%] left-1/2 transform -translate-x-1/2",
          "w-[1200px] h-[1200px] dark:hidden",
          "bg-gradient-radial from-purple-400/50 via-purple-300/40 to-transparent",
          "rounded-full blur-[120px] animate-pulse-slow"
        )} />
        <div className={cn(
          "absolute bottom-[5%] left-1/2 transform -translate-x-1/2",
          "w-[800px] h-[800px] dark:hidden",
          "bg-gradient-radial from-purple-300/40 via-purple-200/30 to-transparent",
          "rounded-full blur-[90px] animate-pulse-slow delay-300"
        )} />
        
        {/* Geometric accents */}
        <div className={cn(
          "absolute top-[-10%] left-[-5%]",
          "w-[600px] h-[600px]",
          "bg-gradient-to-br from-blue-200/30 via-purple-200/30 to-transparent dark:bg-[#462961]",
          "rounded-[100px] rotate-[30deg] dark:opacity-30 blur-[80px] animate-float"
        )} />
        <div className={cn(
          "absolute bottom-[30%] right-[25%]",
          "w-[250px] h-[250px]",
          "bg-gradient-conic from-blue-200/30 via-purple-200/30 to-blue-200/30 dark:bg-transparent",
          "rounded-full blur-[40px] animate-spin-slow"
        )} />
      </div>
    );
  }