import nextConfigs from '@ever-teams/eslint-config/next.mjs';
import rootConfig from '../../../../eslint.config.mjs';

/**
 * ESLint 9 flat config. This file held a copy of examples/base/.eslintrc.js written as
 * an eslintrc object (`extends`), which flat config rejects, so ESLint crashed on it.
 * It is now the flat config examples/base uses, with the intended `parserOptions` instead of the `parseOptions` typo.
 * The earlier, commented-out config is kept below.
 */
export default [
	...rootConfig,
	...nextConfigs,
	{
		// Type-aware parsing for the TypeScript files (`eslint .` also lints the JavaScript config files) that
		// tsconfig.json includes: it leaves out the tests.
		files: ['**/*.{ts,tsx}'],
		ignores: ['**/*.spec.ts', '**/*.e2e.ts'],
		languageOptions: {
			sourceType: 'module',
			parserOptions: {
				project: 'tsconfig.json',
				tsconfigRootDir: import.meta.dirname
			}
		}
	}
];

// import antfu from '@antfu/eslint-config';
// import nextPlugin from '@next/eslint-plugin-next';
// import jestDom from 'eslint-plugin-jest-dom';
// import jsxA11y from 'eslint-plugin-jsx-a11y';
// import playwright from 'eslint-plugin-playwright';
// import testingLibrary from 'eslint-plugin-testing-library';
// export default antfu(
// 	{
// 		react: true,
// 		typescript: true,
// 		lessOpinionated: true,
// 		isInEditor: false,
// 		stylistic: {
// 			semi: true
// 		},
// 		formatters: {
// 			css: true
// 		},
// 		ignores: ['migrations/**/*', 'next-env.d.ts']
// 	},
// 	jsxA11y.flatConfigs.recommended,
// 	{
// 		plugins: {
// 			'@next/next': nextPlugin
// 		},
// 		rules: {
// 			...nextPlugin.configs.recommended.rules,
// 			...nextPlugin.configs['core-web-vitals'].rules
// 		}
// 	},
// 	{
// 		files: ['**/*.test.ts?(x)'],
// 		...testingLibrary.configs['flat/react'],
// 		...jestDom.configs['flat/recommended']
// 	},
// 	{
// 		files: ['**/*.spec.ts', '**/*.e2e.ts'],
// 		...playwright.configs['flat/recommended']
// 	},
// 	{
// 		rules: {
// 			'antfu/no-top-level-await': 'off', // Allow top-level await
// 			'style/brace-style': ['error', '1tbs'], // Use the default brace style
// 			'ts/consistent-type-definitions': ['error', 'type'], // Use `type` instead of `interface`
// 			'react/prefer-destructuring-assignment': 'off', // Vscode doesn't support automatically destructuring, it's a pain to add a new variable
// 			'node/prefer-global/process': 'off', // Allow using `process.env`
// 			'test/padding-around-all': 'error', // Add padding in test files
// 			'test/prefer-lowercase-title': 'off' // Allow using uppercase titles in test titles
// 		}
// 	}
// );
