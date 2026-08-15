import { CodeBlock } from "../../ui/CodeBlock";

export const DeployGuide = () => (
  <div className="mb-32">
    <h2 className="text-4xl font-bold mb-8 text-slate-900 dark:text-slate-100">Advanced Integration</h2>
    
    <p className="text-slate-600 dark:text-slate-400 mb-8">
      If you need to embed Builder.io content in your code, you have two methods:
    </p>

    <div className="space-y-12">
      <div>
        <h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
          Method 1: Dynamic Content <span className="text-blue-600 dark:text-blue-400">(Recommended for Regular Updates)</span>
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          This method allows content updates through Builder.io without code changes:
        </p>

        <div className="space-y-6">
          <div>
            <p className="text-slate-600 dark:text-slate-400 mb-2">Install required packages:</p>
            <CodeBlock
              language="bash"
              code="npm install @ever-teams/atoms @builder.io/react @builder.io/sdk"
            />
          </div>

          <div>
            <p className="text-slate-600 dark:text-slate-400 mb-2">Initialize in your application:</p>
            <CodeBlock
              language="typescript"
              code={`import { Builder } from '@builder.io/react';
Builder.init('YOUR_API_KEY');

// In your page component
const MyPage = () => {
  const content = await builder.get('page', {
    // Use URL path
    userAttributes: {
      urlPath: '/your-page'
    }
    // OR use custom identifier
    query: {
      'data.pageId': 'homepage'
    }
  }).toPromise();

  return <BuilderComponent content={content} />;
};`}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
          Method 2: Generated Code <span className="text-slate-600 dark:text-slate-400">(Best for Static Content)</span>
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Use this when you want code that you&apos;ll maintain directly:
        </p>

        <div className="space-y-4">
          <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-400">
            <li>Export the code from Builder.io</li>
          </ul>

          <div>
            <p className="text-slate-600 dark:text-slate-400 mb-2">Integrate into your project:</p>
            <CodeBlock
              language="typescript"
              code={`import { TeamsProvider } from '@ever-teams/atoms';

export default function App() {
  return (
    <TeamsProvider>
      {/* Your exported Builder.io components */}
    </TeamsProvider>
  );
}`}
            />
          </div>

          <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-400">
            <li>Customize and maintain in your codebase</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);