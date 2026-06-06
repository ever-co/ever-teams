'use client';

interface PageTitleProps {
  title: string;
  description?: string;
}

export function PageTitle({ title, description }: PageTitleProps) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-200">
        {title}
      </h1>
      {description && (
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800/50 p-3 rounded-lg">
          <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="8" />
          </svg>
          <p className="text-sm">{description}</p>
        </div>
      )}
    </div>
  );
}