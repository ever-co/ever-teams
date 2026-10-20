import { resolve } from 'node:path';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import globals from 'globals';
import tseslint from 'typescript-eslint';

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
			'arrow-body-style': ['error', 'as-needed'],
			'no-useless-escape': 'off',
			'no-irregular-whitespace': 'error',
			'no-trailing-spaces': 'error',
			'no-useless-catch': 'warn',
			'no-case-declarations': 'error',
			'no-duplicate-imports': 'error',
			'no-unreachable': 'error',
			'no-undef': 'error',
			'prefer-const': 'error',
			'react/jsx-boolean-value': 'error',
			'react/jsx-key': 'error',
			'react/self-closing-comp': ['error', { component: true, html: true }],
			'react/jsx-no-duplicate-props': 'error',
			'@typescript-eslint/no-unused-vars': ['warn'],
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-useless-empty-export': 'error',
			'@typescript-eslint/no-unused-expressions': 'warn',
			'@typescript-eslint/prefer-ts-expect-error': 'warn',
			'import/order': [
				'warn',
				{
					groups: ['builtin', 'external', 'internal', 'parent', 'sibling'],
					pathGroups: [
						{
							pattern: '@ever-teams/**',
							group: 'external',
							position: 'after'
						},
						{
							pattern: '@/**',
							group: 'internal',
							position: 'before'
						}
					],
					pathGroupsExcludedImportTypes: ['builtin', 'internal', 'react'],
					alphabetize: {
						order: 'asc',
						caseInsensitive: true
					}
				}
			]
		}
	},
	{
		// Enforced by base.js through typescript-eslint 5's recommended preset, which typescript-eslint 8 dropped them
		// from (moved to its stylistic and strict presets; `@typescript-eslint/no-loss-of-precision` was removed for
		// the core rule): kept so that the upgrade does not stop enforcing them.
		rules: {
			'no-loss-of-precision': 'error',
			'@typescript-eslint/adjacent-overload-signatures': 'error',
			'@typescript-eslint/no-empty-function': 'error',
			'@typescript-eslint/no-inferrable-types': 'error',
			'@typescript-eslint/no-non-null-assertion': 'warn'
		}
	}
];

export default baseConfig;
