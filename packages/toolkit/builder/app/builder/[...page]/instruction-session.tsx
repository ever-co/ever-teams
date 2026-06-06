import { CodeImplementationGuide } from "./code-implementation-guide";

export const InstructionsSection = () => (
  <div className="space-y-6">
    <div className="space-y-4">
      <h3 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">
        Getting Started with Builder.io
      </h3>
      <ol className="list-decimal pl-4 space-y-3 text-sm text-slate-600 dark:text-slate-400">
        <li>
          <strong className="text-slate-700 dark:text-slate-300">Get your API key:</strong>
          <ul className="list-disc pl-4 mt-1 space-y-1">
            <li>Log in to your Builder.io account</li>
            <li>Go to &apos;Account Settings&apos; → &apos;API Keys&apos;</li>
            <li>Copy your public API key</li>
          </ul>
        </li>
        <li>
          <strong className="text-slate-700 dark:text-slate-300">Set up your API key:</strong>
          <ul className="list-disc pl-4 mt-1 space-y-1">
            <li>Paste your API key in the input field above</li>
            <li>Click &apos;Save API Key&apos; to connect to Builder.io</li>
          </ul>
        </li>
        <li>
          <strong className="text-slate-700 dark:text-slate-300">Create your content:</strong>
          <ul className="list-disc pl-4 mt-1 space-y-1">
            <li>In Builder.io, create a new page</li>
            <li>Set the URL to match current path (e.g., /builder/home)</li>
            <li>Design your page using the visual editor</li>
            <li><em className="text-blue-600 dark:text-blue-400">Important:</em> Click &apos;Publish&apos; when ready</li>
          </ul>
        </li>
        <li>
          <strong className="text-slate-700 dark:text-slate-300">View your content:</strong>
          <ul className="list-disc pl-4 mt-1 space-y-1">
            <li>Your published content will appear in the preview panel</li>
            <li>Changes may take a few moments to reflect</li>
          </ul>
        </li>
      </ol>
    </div>

    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
      <p className="text-sm text-blue-700 dark:text-blue-300">
        <span className="font-semibold">Pro tip:</span> Make sure to publish your content in Builder.io after making changes. Unpublished changes won&apos;t appear in the preview.
      </p>
    </div>

    <CodeImplementationGuide />
  </div>
);
