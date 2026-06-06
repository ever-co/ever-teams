import Link from 'next/link';

export const NoApiKeyMessage: React.FC = () => (
    <div className="main-content app-content p-8 w-full min-h-full">
      <h1 className="text-4xl font-bold mb-8 text-slate-900 dark:text-slate-100">
        Your app is ready to host Plasmic Studio!
      </h1>
  
      <p className="text-slate-600 dark:text-slate-400 mb-6">
        Open your project in{' '}
        <Link 
          href="https://studio.plasmic.app" 
          target="_blank" 
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Plasmic Studio
        </Link>
        , click on the ellipsis menu by the name of the project on the top-left corner, 
        and select &quot;Configure project&quot;.
      </p>
  
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg mb-6">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Enter the following app host URL (taking care to specify the http/https dropdown correctly), 
          and press Confirm.
        </p>
        <code className="mt-2 block bg-slate-100 dark:bg-slate-800 p-3 rounded text-sm text-slate-800 dark:text-slate-200">
          http://localhost:3000/plasmic/plasmic-host
        </code>
      </div>
  
      <p className="text-slate-600 dark:text-slate-400 mb-4">
        Your project should now reload with the new app host.
      </p>
  
      <p className="text-slate-600 dark:text-slate-400">
        Now, any code components you register from your codebase will show up in this Plasmic project. 
        Follow the{' '}
        <Link 
          href="/learn/registering-code-components" 
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          component registration guide here
        </Link>!
      </p>
    </div>
  );
