import { cn } from '@ever-teams/toolkit-ui';

interface GradientBackgroundProps {
  className?: string;
}

export function GradientBackground({ className }: GradientBackgroundProps) {
  return (
    <>
      {/* Primary background gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50/80 dark:from-black dark:via-[#0A0A0C] dark:to-[#0A0A0C]" />
      
      {/* Animated background gradients */}
      <div className={cn("fixed inset-0 overflow-hidden pointer-events-none", className)}>
        {/* Futuristic mesh gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.05),rgba(59,130,246,0.08))] dark:bg-none" />
        
        {/* Large center purple effect - dark theme only */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] hidden dark:block bg-[#462961]/20 rounded-full blur-[150px] animate-pulse-slow" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] hidden dark:block bg-[#8B5CF6]/10 rounded-full blur-[120px] animate-pulse-slow delay-300" />
        
        {/* Large bottom purple effect - light theme only */}
        <div className="absolute bottom-[-10%] left-1/2 transform -translate-x-1/2 w-[1200px] h-[1200px] bg-gradient-radial from-purple-400/50 via-purple-300/40 to-transparent dark:hidden rounded-full blur-[120px] animate-pulse-slow" />
        
        {/* Additional purple glow for emphasis - light theme only */}
        <div className="absolute bottom-[5%] left-1/2 transform -translate-x-1/2 w-[800px] h-[800px] bg-gradient-radial from-purple-300/40 via-purple-200/30 to-transparent dark:hidden rounded-full blur-[90px] animate-pulse-slow delay-300" />
        
        {/* Modern geometric shapes */}
        <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-gradient-to-br from-blue-200/30 via-purple-200/30 to-transparent dark:bg-[#462961] rounded-[100px] rotate-[30deg] dark:opacity-30 blur-[80px] animate-float" />
        <div className="absolute top-[20%] right-[-5%] w-[500px] h-[500px] bg-gradient-to-bl from-purple-200/40 via-blue-200/30 to-transparent dark:bg-transparent rounded-[80px] rotate-[-45deg] blur-[70px] animate-pulse" />
        
        {/* Interactive light effects */}
        <div className="absolute top-[40%] left-[15%] w-[300px] h-[300px] bg-gradient-radial from-purple-300/20 via-blue-200/20 to-transparent dark:bg-transparent rounded-full blur-[50px] animate-pulse delay-700" />
        <div className="absolute bottom-[30%] right-[25%] w-[250px] h-[250px] bg-gradient-conic from-blue-200/30 via-purple-200/30 to-blue-200/30 dark:bg-transparent rounded-full blur-[40px] animate-spin-slow" />
        
        {/* Dynamic accent elements */}
        <div className="absolute bottom-[-5%] left-[10%] w-[400px] h-[400px] bg-gradient-to-tr from-blue-200/40 via-purple-200/30 to-transparent dark:bg-transparent rounded-[60px] rotate-[15deg] blur-[60px] animate-float delay-1000" />
        <div className="absolute top-[60%] right-[5%] w-[350px] h-[350px] bg-gradient-to-tl from-purple-200/30 via-blue-200/20 to-transparent dark:bg-transparent rounded-[70px] rotate-[-60deg] blur-[55px] animate-pulse delay-500" />
      </div>

      {/* Modernized grid pattern */}
      <div 
        className="fixed inset-0 opacity-[0.07] dark:opacity-[0.15]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #00000006 1px, transparent 1px),
            linear-gradient(to bottom, #00000006 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px'
        }}
      />
    </>
  );
} 