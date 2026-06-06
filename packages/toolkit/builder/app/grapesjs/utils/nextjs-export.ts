import { GrapesJSEditor, GrapesComponent } from '../types';
import { GrapesJSError } from './error-handler';
import { GrapesJSErrorType } from '../constants/error-types';
import JSZip from 'jszip';
import { processComponents } from '@/utils/component-parser';
import { separateGlobalAndModuleStyles } from './css-formatter';
import { generateImportsByCategory } from './import-generator';
import { generateTypesDefinition } from './type-generator';

export const handleNextJSExport = async (editor: GrapesJSEditor): Promise<void> => {
	if (!editor) {
		throw new GrapesJSError(GrapesJSErrorType.EXPORT_ERROR, 'nextjs', 'Editor is not initialized');
	}

	try {
		const zip = new JSZip();
		let componentsToProcess: GrapesComponent[] = [];

		// Get wrapper first as it's more reliable
		const wrapper = editor.DomComponents?.getWrapper();
		if (wrapper && typeof wrapper.components === 'function') {
			const components = wrapper.components();
			if (components?.models) {
				componentsToProcess = components.models;
			}
		}

		if (!componentsToProcess.length) {
			throw new GrapesJSError(GrapesJSErrorType.EXPORT_ERROR, 'nextjs', 'No components found to export');
		}

		// Process HTML to React components
		const processedHtml = processComponents(editor.getHtml());

		// Process CSS
		const { globalStyles, moduleStyles } = separateGlobalAndModuleStyles(editor.getCss());

		// Generate imports by category
		const importGroups = generateImportsByCategory(editor);

		// Generate TypeScript definitions
		const typeDefinitions = generateTypesDefinition(componentsToProcess);

		// Create project structure
		const rootDir = zip.folder('teams-nextjs-project');
		if (!rootDir) {
			throw new GrapesJSError(GrapesJSErrorType.EXPORT_ERROR, 'nextjs', 'Failed to create root directory');
		}

		const srcDir = rootDir.folder('src');
		const appDir = srcDir?.folder('app');
		const componentsDir = appDir?.folder('components');
		const stylesDir = appDir?.folder('styles');
		const typesDir = srcDir?.folder('types');

		if (!srcDir || !appDir || !componentsDir || !stylesDir || !typesDir) {
			throw new GrapesJSError(GrapesJSErrorType.EXPORT_ERROR, 'nextjs', 'Failed to create directory structure');
		}

		// Create page.tsx with imports
		const pageContent = `'use client';
import { FC } from 'react';
${importGroups
	.map((group) => {
		const allImports = [...group.components, ...group.inputs];
		return allImports.length ? `import { ${allImports.join(', ')} } from '@ever-teams/atoms';` : '';
	})
	.filter(Boolean)
	.join('\n')}
import styles from './styles/page.module.css';

const Page: FC = () => {
	return (
		<div className={styles.container}>
			${processedHtml}
		</div>
	);
};

export default Page;`;

		// Create layout.tsx with TeamsProvider
		const layoutContent = `
'use client';
import { FC, ReactNode } from 'react';
import type { Metadata } from 'next';
import { TeamsProvider } from '@ever-teams/atoms';
import './styles/globals.css';

interface RootLayoutProps {
	children: ReactNode;
}

const RootLayout: FC<RootLayoutProps> = ({ children }) => {
	return (
		<html lang="en" suppressHydrationWarning>
			<head />
			<body>
				<TeamsProvider>
					{children}
				</TeamsProvider>
			</body>
		</html>
	);
};

export default RootLayout;`;

		// Create configuration files
		const packageJson = {
			name: 'teams-nextjs-project',
			version: '0.1.0',
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
				'react-dom': '^18'
			},
			devDependencies: {
				'@types/node': '^20',
				'@types/react': '^18',
				'@types/react-dom': '^18',
				typescript: '^5'
			}
		};

		const tsConfig = {
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
			include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
			exclude: ['node_modules']
		};

		// Add all files to ZIP
		appDir.file('layout.tsx', layoutContent);
		appDir.file('page.tsx', pageContent);
		stylesDir.file('globals.css', `@import '@ever-teams/atoms/styles.css';\n\n${globalStyles}`);
		stylesDir.file('page.module.css', `.container {\n  width: 100%;\n  height: 100%;\n}\n\n${moduleStyles}`);
		typesDir.file('types.d.ts', typeDefinitions);
		rootDir.file('package.json', JSON.stringify(packageJson, null, 2));
		rootDir.file('tsconfig.json', JSON.stringify(tsConfig, null, 2));
		rootDir.file('.gitignore', 'node_modules\n.next\n.env\n');
		rootDir.file(
			'next-env.d.ts',
			'/// <reference types="next" />\n/// <reference types="next/image-types/global" />'
		);

		// Generate and download ZIP
		const content = await zip.generateAsync({ type: 'blob' });
		const url = URL.createObjectURL(content);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'teams-nextjs-project.zip';
		link.click();
		URL.revokeObjectURL(url);
	} catch (error) {
		throw new GrapesJSError(GrapesJSErrorType.EXPORT_ERROR, 'nextjs', `Failed to export Next.js project: ${error}`);
	}
};
