import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
	stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
	addons: [
		getAbsolutePath('@storybook/addon-onboarding'),
		getAbsolutePath('@storybook/addon-links'),
		getAbsolutePath('@chromatic-com/storybook'),
		getAbsolutePath('@storybook/addon-docs')
	],
	framework: {
		name: getAbsolutePath('@storybook/nextjs-vite'),
		options: {}
	},
	staticDirs: ['../public'],
	typescript: {
		// Disable react-docgen to avoid stack overflow on large bundled files
		reactDocgen: false
	},
	// The kit's modules keep their "use client" directive for React Server Components. Bundled for the browser here,
	// the directive has no use: Vite drops it and would warn once per client module.
	viteFinal: (viteConfig) => {
		const onwarn = viteConfig.build?.rollupOptions?.onwarn;
		return {
			...viteConfig,
			build: {
				...viteConfig.build,
				rollupOptions: {
					...viteConfig.build?.rollupOptions,
					onwarn(warning, warn) {
						const useClientDirective =
							warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('use client');
						if (useClientDirective) {
							return;
						}
						if (onwarn) {
							onwarn(warning, warn);
							return;
						}
						warn(warning);
					}
				}
			}
		};
	}
};
export default config;

function getAbsolutePath(value: string): any {
	return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
