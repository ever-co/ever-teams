import { ContentPreviewProps } from "../../../types";

export const ContentPreview = ({ content }: ContentPreviewProps) => (
  <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
    <div className="space-y-1">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Preview
      </h2>
    </div>
    {content?.id && (
      <a
        href={`https://builder.io/content/${content.id}/edit`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-700 
                 dark:text-slate-400 dark:hover:text-slate-300 bg-slate-100 hover:bg-slate-200 
                 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md focus:outline-none 
                 focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 border 
                 border-slate-300 dark:border-slate-600"
      >
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        Edit in Builder.io
      </a>
    )}
  </div>
);