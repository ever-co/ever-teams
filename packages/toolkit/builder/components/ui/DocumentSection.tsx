import { DocumentSectionProps } from "../../types";

export const DocumentSection = ({ title, description, children, className = "" }: DocumentSectionProps) => (
    <div className={`mb-32 ${className}`}>
        <h2 className="text-4xl font-bold mb-8 text-slate-900 dark:text-slate-100">{title}</h2>
        {description && (
            <div className="prose dark:prose-invert max-w-none mb-8">
                <p className="text-lg text-slate-600 dark:text-slate-400">{description}</p>
            </div>
        )}
        {children}
    </div>
);