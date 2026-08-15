import { CtaButton } from "../../ui/CTAButton";
import { HOMEPAGE_COMMON_STYLES } from "../../../libs/styles";

export const HeroSection = () => (
  <div className="text-center mb-40 mt-28">
    <h1 className="text-6xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
      Time Tracking Integration with
      <br />
      <span className={HOMEPAGE_COMMON_STYLES.gradientText}>
        Builder.io
      </span>
    </h1>
    <p className="text-2xl text-slate-600 dark:text-slate-400 mt-8 max-w-4xl mx-auto">
      Integrate Teams&apos;s Time Tracking components into your Builder.io projects with our visual drag-and-drop components.
    </p>
    <div className="flex items-center justify-center gap-4 mt-14">
      <CtaButton href="/builder/builder-demo" className="mx-auto">
        Try Teams on Builder.io
      </CtaButton>
      <CtaButton 
        href="https://builder.io/c/docs/custom-react-components"
        className="mx-auto"
      >
        View Builder.io Docs
      </CtaButton>
    </div>
  </div>
);