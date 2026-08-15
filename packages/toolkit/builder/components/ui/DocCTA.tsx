import { CtaButton } from "./CTAButton";
import { DocCTAProps } from "../../types";
  
  export const DocCTA = ({ title, description, buttonText, buttonHref }: DocCTAProps) => (
    <div className="mt-24 text-center">
      <h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
        {title}
      </h3>
      <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
        {description}
      </p>
      <CtaButton href={buttonHref} className="mx-auto">
        {buttonText}
      </CtaButton>
    </div>
  );