import { CtaButton } from "../../ui/CTAButton";

export const HeroSection = () => (
    <div className="text-center mb-40 mt-28">
      <h1 className="text-6xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
        Time Tracking Integration with
        <br />
        <span className="bg-gradient-to-r from-[#FF1CF7] to-[#00F0FF] bg-clip-text text-transparent">
          Plasmic Studio
        </span>
      </h1>
      <p className="text-2xl text-slate-600 dark:text-slate-400 mt-8 max-w-4xl mx-auto">
        Seamlessly integrate Teams&apos;s Time Tracking system into your Plasmic projects with our pre-built components and utilities.
      </p>
      <CtaButton href="/plasmic/plasmic-host" className="mx-auto mt-14">
        Try Teams on Plasmic Now
      </CtaButton>
    </div>
  );