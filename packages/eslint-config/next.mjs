import { resolve } from 'node:path';
import nextConfig from 'eslint-config-next';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import rules from './rules.js';

const { commonRules, importOrder, nextPathGroups, typescriptEslint5RecommendedRules } = rules;

const project = resolve(process.cwd(), 'tsconfig.json');

/**
 * ESLint 9 flat config equivalent of next.js (the eslintrc config): `import next from '@ever-teams/eslint-config/next.mjs'`
 * and spread it into the package's eslint.config.mjs.
 *
 * eslint-config-next registers the `react`, `import`, `react-hooks`, `jsx-a11y` and `@next/next` plugins, so they are
 * not registered again here (flat config refuses a second copy of a plugin).
 *
 * @type {import('eslint').Linter.Config[]}
 */
const nextConfigs = [
	{
		ignores: ['**/.*.js']
	},
	...nextConfig,
	prettierConfig,
	...tseslint.configs.recommended,
	{
		languageOptions: {
			globals: {
				...globals.node,
				...globals.browser,
				React: 'readonly',
				JSX: 'readonly'
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
			'@next/next/no-html-link-for-pages': 'off',
			'@next/next/no-img-element': 'off',
			'react-hooks/exhaustive-deps': 'warn',
			'@typescript-eslint/naming-convention': [
				'warn',
				{
					selector: 'variable',
					format: ['camelCase', 'snake_case', 'UPPER_CASE', 'PascalCase'],
					leadingUnderscore: 'allow'
				}
			],
			'import/order': importOrder('error', nextPathGroups)
		}
	},
	{
		rules: typescriptEslint5RecommendedRules
	}
];

export default nextConfigs;
