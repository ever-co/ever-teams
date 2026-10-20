import { resolve } from 'node:path';
import nextConfig from 'eslint-config-next';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

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
			'no-useless-escape': 'off',
			'prefer-const': 'error',
			'no-irregular-whitespace': 'error',
			'no-trailing-spaces': 'error',
			'no-duplicate-imports': 'error',
			'no-useless-catch': 'warn',
			'no-case-declarations': 'error',
			'no-undef': 'error',
			'no-unreachable': 'error',
			'arrow-body-style': ['error', 'as-needed'],
			'@next/next/no-html-link-for-pages': 'off',
			'@next/next/no-img-element': 'off',
			'react/jsx-key': 'error',
			'react/self-closing-comp': ['error', { component: true, html: true }],
			'react/jsx-boolean-value': 'error',
			'react/jsx-no-duplicate-props': 'error',
			'react-hooks/exhaustive-deps': 'warn',
			'@typescript-eslint/no-unused-expressions': 'warn',
			'@typescript-eslint/no-unused-vars': ['warn'],
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-useless-empty-export': 'error',
			'@typescript-eslint/prefer-ts-expect-error': 'warn',
			'@typescript-eslint/naming-convention': [
				'warn',
				{
					selector: 'variable',
					format: ['camelCase', 'snake_case', 'UPPER_CASE', 'PascalCase'],
					leadingUnderscore: 'allow'
				}
			],
			'import/order': [
				'error',
				{
					groups: ['builtin', 'external', 'internal', 'parent', 'sibling'],
					pathGroups: [
						{
							pattern: 'react',
							group: 'external',
							position: 'before'
						},
						{
							pattern: 'lucide-react',
							group: 'external',
							position: 'after'
						},
						{
							pattern: '@ever-teams/**',
							group: 'external',
							position: 'after'
						},
						{
							pattern: '@/**',
							group: 'internal'
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
		// Enforced by next.js through typescript-eslint 5's recommended preset, which typescript-eslint 8 dropped them
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

export default nextConfigs;
