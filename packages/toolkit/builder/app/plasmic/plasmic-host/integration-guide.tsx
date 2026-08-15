import React from 'react';
import Link from 'next/link';
import { CodeBlock } from '../../../components/ui/CodeBlock';

export const IntegrationGuide: React.FC = () => (
    <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">
            Integration Guide
        </h3>

        <div className="space-y-8">
            <IntegrationStep
                number={1}
                title="Installation"
                content={
                    <div className="ml-8">
                        <CodeBlock
                            language="bash"
                            code="npm install @plasmicapp/loader-nextjs"
                        />
                    </div>
                }
            />

            <IntegrationStep
                number={2}
                title="Configuration"
                content={
                    <ConfigurationSection />
                }
            />

            <IntegrationStep
                number={3}
                title="Environment Variables"
                content={
                    <EnvironmentVariablesSection />
                }
            />
        </div>
    </div>
);

const IntegrationStep: React.FC<{
    number: number;
    title: string;
    content: React.ReactNode;
}> = ({ number, title, content }) => (
    <div>
        <h4 className="text-md font-medium mb-3 text-slate-700 dark:text-slate-300 flex items-center">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-sm mr-2">
                {number}
            </span>
            {title}
        </h4>
        {content}
    </div>
);

const ConfigurationSection: React.FC = () => (
    <div className="ml-8 space-y-6">
        <div>
            <h5 className="text-sm font-medium mb-2 text-slate-600 dark:text-slate-400">
                Next.js Pages Router
            </h5>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Create a <code className="inline-block px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">plasmic-init.ts</code> file in your project root:
            </p>
            <CodeBlock
                language="typescript"
                code={`import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: process.env.NEXT_PUBLIC_PLASMIC_PROJECT_ID,
      token: process.env.NEXT_PUBLIC_PLASMIC_API_TOKEN
    }
  ],
  preview: true
});`}
            />
        </div>

        <div>
            <h5 className="text-sm font-medium mb-2 text-slate-600 dark:text-slate-400">
                Next.js App Router
            </h5>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                For App Router, create two files:
            </p>

            <div className="space-y-4">
                <FileExample
                    filename="plasmic-init.ts"
                    code={`import { initPlasmicLoader } from "@plasmicapp/loader-nextjs/react-server-conditional";

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: process.env.NEXT_PUBLIC_PLASMIC_PROJECT_ID,
      token: process.env.NEXT_PUBLIC_PLASMIC_API_TOKEN
    }
  ],
  preview: true
});`}
                />

                <FileExample
                    filename="plasmic-init-client.tsx"
                    code={`'use client';

import { PlasmicRootProvider } from '@plasmicapp/loader-nextjs';
import { PLASMIC } from './plasmic-init';

export function PlasmicClientRootProvider(
  props: Omit<React.ComponentProps<typeof PlasmicRootProvider>, 'loader'>
) {
  return <PlasmicRootProvider loader={PLASMIC} {...props} />;
}`}
                />
            </div>
        </div>
    </div>
);

const FileExample: React.FC<{ filename: string; code: string }> = ({ filename, code }) => (
    <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
            {filename}
        </p>
        <CodeBlock language="typescript" code={code} />
    </div>
);

const EnvironmentVariablesSection: React.FC = () => (
    <div className="ml-8">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            Add these variables to your <code className="inline-block px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">.env.local</code> file:
        </p>
        <CodeBlock
            language="bash"
            code={`NEXT_PUBLIC_PLASMIC_PROJECT_ID=your_project_id
NEXT_PUBLIC_PLASMIC_API_TOKEN=your_api_token`}
        />
    </div>
);
