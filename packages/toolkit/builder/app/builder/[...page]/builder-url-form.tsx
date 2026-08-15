import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

export const BuilderUrlForm = ({ pageUrl, setPageUrl }: { pageUrl: string; setPageUrl: (url: string) => void }) => {
  const pathname = usePathname();
  const [formattedUrl, setFormattedUrl] = useState(pageUrl);
  const prevPageUrlRef = useRef(pageUrl);

  useEffect(() => {
    if (pathname) {
      setFormattedUrl(pathname);
    }
  }, [pathname]);

  useEffect(() => {
    if (pageUrl && pageUrl !== prevPageUrlRef.current) {
      setFormattedUrl(pageUrl);
      prevPageUrlRef.current = pageUrl;
    }
  }, [pageUrl]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (formattedUrl) {
      setPageUrl(formattedUrl);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="pageUrl" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Builder.io Page URL
        </label>
        <input
          type="text"
          id="pageUrl"
          value={formattedUrl}
          onChange={(e) => setFormattedUrl(e.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700
                   bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2
                   focus:ring-blue-500 dark:focus:ring-blue-400 text-slate-700 dark:text-slate-300"
          placeholder="e.g., /home or /about"
        />
      </div>
      <button
        type="submit"
        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700
                 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md focus:outline-none
                 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
      >
        Save
      </button>
    </form>
  );
};
