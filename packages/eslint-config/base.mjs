import { resolve } from 'node:path';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import rules from './rules.js';

const { basePathGroups, commonRules, importOrder, typescriptEslint5RecommendedRules } = rules;

const project = resolve(process.cwd(), 'tsconfig.json');

/**
 * ESLint 9 flat config equivalent of base.js (the eslintrc config): `import base from '@ever-teams/eslint-config/base.mjs'`
 * and spread it into the package's eslint.config.mjs.
 *
 * base.js also turned off `@next/next/no-img-element` and `@next/next/no-html-link-for-pages`, but it never loaded the
 * `@next/next` plugin, so those entries did nothing; flat config refuses rules of a plugin it does not know, so they
 * are left out here.
 *
 * @type {import('eslint').Linter.Config[]}
 */
const baseConfig = [
	{
		ignores: ['**/.*.js', '**/dist/']
	},
	prettierConfig,
	...tseslint.configs.recommended,
	{
		plugins: {
			react: reactPlugin,
			import: importPlugin
		},
		languageOptions: {
			globals: {
				...globals.node,
				...globals.browser,
				React: 'writable',
				JSX: 'writable'
			}
		},
		settings: {
			'import/resolver': {
				typescript: {
					project
				}
			}
		},
		rules: {
			...commonRules,
			'import/order': importOrder('warn', basePathGroups)
		}
	},
	{
		rules: typescriptEslint5RecommendedRules
	}
];

export default baseConfig;
