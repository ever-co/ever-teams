const { resolve } = require('node:path');

const project = resolve(process.cwd(), 'tsconfig.json');

/** @type {import("eslint").Linter.Config} */
module.exports = {
	extends: ['prettier', 'plugin:@typescript-eslint/recommended'],
	plugins: ['react', '@typescript-eslint', 'import'],
	globals: {
		React: true,
		JSX: true
	},
	env: {
		node: true,
		browser: true
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
		'@next/next/no-img-element': 'off',
		'@next/next/no-html-link-for-pages': 'off',
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
	},

	ignorePatterns: ['.*.js', 'node_modules/', 'dist/']
};
