import { CodeBlock } from "../../ui/CodeBlock";

export const QuickStart = () => (
  <div className="mb-32">
    <h2 className="text-4xl font-bold mb-8 text-slate-900 dark:text-slate-100">Quick Start</h2>
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">1. Connect to Builder.io</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Follow these steps to connect your Builder.io account:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-400">
          <li>Log in to your Builder.io account</li>
          <li>Go to &apos;Account Settings&apos; → &apos;API Keys&apos;</li>
          <li>Copy your public API key</li>
          <li>Paste your API key in the Teams Visual Builder input field</li>
          <li>Click &apos;Save API Key&apos; to connect</li>
        </ul>
      </div>
      
      <div>
        <h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">2. Create Your Content</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Start building your content in Builder.io:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-400">
          <li>In Builder.io, create a new page</li>
          <li>Set the URL to match your desired path (e.g., /builder/home)</li>
          <li>Design your page using the visual editor</li>
          <li><em className="text-blue-600 dark:text-blue-400">Important:</em> Click &apos;Publish&apos; when ready</li>
        </ul>
      </div>

      <div>
        <h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">3. View Your Content</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Preview and test your content:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-400">
          <li>Input your content page URL in the input field</li>
          <li>Your published content will appear in the preview panel</li>
          <li>Changes may take a few moments to reflect</li>
          <li>Preview your page across different device sizes</li>
        </ul>
      </div>

      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <span className="font-semibold">Pro tip:</span> Always remember to publish your content in Builder.io after making changes. Unpublished changes won&apos;t appear in the preview.
        </p>
      </div>
    </div>
  </div>
);