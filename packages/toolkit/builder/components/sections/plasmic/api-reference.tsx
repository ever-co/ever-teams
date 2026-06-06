import { cn } from '@ever-teams/toolkit-ui';

export const ApiReference = () => (
  <div className="mb-32">
    <h2 className="text-4xl font-bold mb-8 text-slate-900 dark:text-slate-100">API Reference</h2>
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">Component Props</h3>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">Prop</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">Type</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-4 text-sm text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">source</td>
                <td className="p-4 text-sm font-mono text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                  &apos;storybook&apos; | &apos;example&apos;
                  </code>
                </td>
                <td className="p-4 text-sm text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">Source context for the form</td>
              </tr>
              <tr className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-4 text-sm text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">className</td>
                <td className="p-4 text-sm font-mono text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">string</code>
                </td>
                <td className="p-4 text-sm text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">Additional CSS classes</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
);