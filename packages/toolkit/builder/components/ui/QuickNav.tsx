import { QuickNavProps } from "../../types";

export const QuickNav = ({ links }: QuickNavProps) => (
    <div className="flex flex-wrap gap-4 mb-8">
        {links.map(({ href, label }) => (
            <a
                key={href}
                href={href}
                className="px-4 py-2 text-sm rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
                {label}
            </a>
        ))}
    </div>
);