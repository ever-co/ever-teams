import { CtaButton } from "../../ui/CTAButton";

export const HeroSection = () => (
  <div className="text-center py-20 px-4">
    <h1 className="text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-500">
      GrapesJS + Teams Integration
    </h1>
    <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
      Integrate Teams&apos;s powerful time tracking components with GrapesJS&apos;s open-source web builder framework. Create custom interfaces without writing code.
    </p>
    <div className="flex justify-center gap-4">
      <CtaButton href="/grapesjs">Try Demo</CtaButton>
    </div>
  </div>
);