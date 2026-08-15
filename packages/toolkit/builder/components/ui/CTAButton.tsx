import { ArrowRightIcon } from "lucide-react";

interface CtaButtonProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export const CtaButton = ({ href, children, className = "" }: CtaButtonProps) => (
  <a
    href={href}
    className={`inline-flex items-center gap-2 px-6 py-3 text-lg font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors ${className}`}
  >
    {children}
    <ArrowRightIcon className="w-5 h-5" />
  </a>
);