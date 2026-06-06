import { HOMEPAGE_COMMON_STYLES } from "../../../libs/styles";
import { HighlightText } from './highlight-text';

export const ValueProposition = () => (
  <div className={HOMEPAGE_COMMON_STYLES.container + " mb-10"}>
    <div className="max-w-5xl mx-auto text-center">
      <p className="text-xl text-gray-700 dark:text-white mb-20 leading-[48px]">
        Drag-and-drop simplicity with <HighlightText>Builder.io</HighlightText> and <HighlightText>Plasmic</HighlightText>, or code-level flexibility with <HighlightText>CraftJS</HighlightText> and <HighlightText>GrapesJS</HighlightText> - Teams empowers you to create solutions tailored to your platform. Perfect for scaling startups or developers building MVPs, Teams&apos;s tools save you time, reduce complexity, and let you focus on delivering results.
      </p>
      <p className="text-xl text-gray-700 dark:text-white leading-[48px]">
        Start creating time tracking features that fit your brand and workflow today.
      </p>
    </div>
  </div>
);
