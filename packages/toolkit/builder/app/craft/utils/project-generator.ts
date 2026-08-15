import { CraftNextJSExportOptions } from '../types/export';

interface ProjectFiles {
	components: string;
	imports: string[];
	options: CraftNextJSExportOptions;
}

export const generateProjectFiles = ({ components, imports, options }: ProjectFiles): Record<string, string> => {
	return {
		'src/app/page.tsx': `'use client';
import { FC } from 'react';
${imports.map((imp) => `import { ${imp} } from '@ever-teams/atoms';`).join('\n')}

const Page: FC = () => {
  return (
    <div className="w-full min-h-screen p-4">
      ${components}
    </div>
  );
};

export default Page;`,

		'src/app/layout.tsx': `'use client';
import { FC, ReactNode } from 'react';
import { TeamsProvider } from '@ever-teams/atoms';
import './styles/globals.css';

interface RootLayoutProps {
  children: ReactNode;
}

const RootLayout: FC<RootLayoutProps> = ({ children }) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <TeamsProvider>
          {children}
        </TeamsProvider>
      </body>
    </html>
  );
};

export default RootLayout;`,

		'src/app/styles/globals.css': `@import '@ever-teams/atoms/styles.css';

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}`,

		'package.json': JSON.stringify(
			{
				name: options.projectName || 'craft-nextjs-project',
				version: options.version || '0.1.0',
				private: true,
				scripts: {
					dev: 'next dev',
					build: 'next build',
					start: 'next start',
					lint: 'next lint'
				},
				dependencies: {
					'@ever-teams/atoms': 'latest',
					next: '14.1.0',
					react: '^18',
					'react-dom': '^18',
					...options.dependencies
				},
				devDependencies: {
					'@types/node': '^20',
					'@types/react': '^18',
					'@types/react-dom': '^18',
					typescript: '^5'
				}
			},
			null,
			2
		),

		'tsconfig.json': JSON.stringify(
			{
				compilerOptions: {
					target: 'es5',
					lib: ['dom', 'dom.iterable', 'esnext'],
					allowJs: true,
					skipLibCheck: true,
					strict: true,
					noEmit: true,
					esModuleInterop: true,
					module: 'esnext',
					moduleResolution: 'bundler',
					resolveJsonModule: true,
					isolatedModules: true,
					jsx: 'preserve',
					incremental: true,
					plugins: [{ name: 'next' }],
					paths: { '@/*': ['./src/*'] }
				},
				include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'],
				exclude: ['node_modules']
			},
			null,
			2
		),

		'.gitignore': 'node_modules\n.next\n.env\n',

		'next-env.d.ts': '/// <reference types="next" />\n/// <reference types="next/image-types/global" />'
	};
};
