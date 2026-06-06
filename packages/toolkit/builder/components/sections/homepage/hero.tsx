import { HOMEPAGE_COMMON_STYLES } from "../../../libs/styles";

export const HeroSection = () => (
  <div className="text-center mb-40 mt-28">
    <h1 className="text-6xl font-bold text-gray-900 dark:text-white/90 leading-tight">
      Seamlessly Integrate Time Tracking
      <br />
      with Teams&apos;s{' '}
      <span className={HOMEPAGE_COMMON_STYLES.gradientText}>Embeddable Kit</span>
    </h1>
    <p className="text-2xl text-gray-700 dark:text-white mt-8 max-w-4xl mx-auto">
      Choose the perfect Visual Builder for your platform: Compare Plasmic, Builder.io, GrapesJS, and CraftJS to customize your integration with ease.
    </p>
  </div>
);