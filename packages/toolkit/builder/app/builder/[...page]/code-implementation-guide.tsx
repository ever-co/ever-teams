import { CodeBlock } from "../../../components/ui/CodeBlock";

export const CodeImplementationGuide = () => (
  <div className="space-y-4">
    <h3 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-slate-200">
      How to Embed The Code
    </h3>

    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          For React Applications:
        </h4>
        <div className="text-xs sm:text-sm">
          <CodeBlock
            language="typescript"
            code={`import { BuilderComponent, builder } from '@builder.io/react';
  
  // Insert your public API key
  builder.init('YOUR_API_KEY');
  
  // In your component
  function MyPage() {
    return (
      <BuilderComponent
        model="page"
        // Insert your page URL or entry ID
        entry="YOUR_PAGE_URL_OR_ENTRY_ID"
      />
    );
  }`}
          />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          For Plain HTML/JavaScript:
        </h4>
        <CodeBlock
          language="html"
          code={`<script src="https://cdn.builder.io/js/webcomponents"></script>
  <builder-component
    model="page"
    api-key="YOUR_API_KEY"
    entry="YOUR_PAGE_URL_OR_ENTRY_ID">
  </builder-component>`}
        />
      </div>

      <div className="text-sm text-slate-600 dark:text-slate-400">
        <p className="font-medium mb-2">To find your page URL or entry ID:</p>
        <ol className="list-decimal pl-4 space-y-1">
          <li>Go to your Builder.io dashboard</li>
          <li>Open the page you created</li>
          <li>Click on &quot;Settings&quot; or the gear icon</li>
          <li>Look for &quot;Entry ID&quot; or use the published URL</li>
        </ol>
      </div>
    </div>
  </div>
);