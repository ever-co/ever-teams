import { CtaButton } from "../../ui/CTAButton";
import { HOMEPAGE_COMMON_STYLES } from "../../../libs/styles";

export const HeroSection = () => (
  <div className="text-center mb-40 mt-28">
    <h1 className="text-6xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
      Time Tracking Integration with
      <br />
      <span className={HOMEPAGE_COMMON_STYLES.gradientText}>
        Craft.js
      </span>
    </h1>
    <p className="text-2xl text-slate-600 dark:text-slate-400 mt-8 max-w-4xl mx-auto">
      Build powerful time tracking interfaces with Craft.js&apos;s React-based page builder and Teams&apos;s customizable components.
    </p>
    <div className="flex items-center justify-center gap-4 mt-14">
      <CtaButton href="/craft" className="mx-auto">
        Try Teams on Craft.js
      </CtaButton>
    </div>
  </div>
);