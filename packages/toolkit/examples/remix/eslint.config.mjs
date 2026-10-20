import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

/**
 * ESLint 9 flat config, replacing .eslintrc.cjs (`root: true`), override for override.
 *
 * eslint-plugin-react-hooks 7's recommended preset adds the React Compiler rules; the old
 * `plugin:react-hooks/recommended` (v4) enabled only the two rules below, so those are what is enabled here.
 */
export default [
	js.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			parserOptions: {
				ecmaFeatures: {
					jsx: true
				}
			},
			globals: {
				...globals.browser,
				...globals.commonjs,
				...globals.es2015
			}
		},
		rules: {
			// In ESLint 8's `eslint:recommended`, which ESLint 9 dropped it from: kept so that it is still enforced.
			'no-inner-declarations': 'error'
		}
	},

	// React
	{
		files: ['**/*.{js,jsx,ts,tsx}'],
		...reactPlugin.configs.flat.recommended,
		settings: {
			react: {
				version: 'detect'
			},
			formComponents: ['Form'],
			linkComponents: [
				{ name: 'Link', linkAttribute: 'to' },
				{ name: 'NavLink', linkAttribute: 'to' }
			],
			'import/resolver': {
				typescript: {}
			}
		}
	},
	{
		files: ['**/*.{js,jsx,ts,tsx}'],
		...reactPlugin.configs.flat['jsx-runtime']
	},
	{
		files: ['**/*.{js,jsx,ts,tsx}'],
		plugins: {
			'react-hooks': reactHooks
		},
		rules: {
			'react-hooks/rules-of-hooks': 'error',
			'react-hooks/exhaustive-deps': 'warn'
		}
	},
	{
		files: ['**/*.{js,jsx,ts,tsx}'],
		...jsxA11y.flatConfigs.recommended
	},

	// Typescript
	...tsPlugin.configs['flat/recommended'].map((config) => ({ ...config, files: ['**/*.{ts,tsx}'] })),
	{
		files: ['**/*.{ts,tsx}'],
		...importPlugin.flatConfigs.recommended
	},
	{
		files: ['**/*.{ts,tsx}'],
		...importPlugin.flatConfigs.typescript,
		settings: {
			...importPlugin.flatConfigs.typescript.settings,
			'import/internal-regex': '^~/',
			'import/resolver': {
				node: {
					extensions: ['.ts', '.tsx']
				},
				typescript: {
					alwaysTryTypes: true
				}
			}
		}
	},

	// Node
	{
		files: ['eslint.config.mjs'],
		languageOptions: {
			globals: globals.node
		}
	}
];
