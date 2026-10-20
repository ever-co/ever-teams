const { resolve } = require('node:path');
const { commonRules, importOrder, nextPathGroups } = require('./rules.js');

const project = resolve(process.cwd(), 'tsconfig.json');

module.exports = {
	extends: ['next', 'prettier', 'plugin:@typescript-eslint/recommended'],
	globals: {
		React: 'readonly',
		JSX: 'readonly'
	},
	env: {
		node: true,
		browser: true
	},
	plugins: ['react', '@typescript-eslint', 'import'],
	settings: {
		'import/resolver': {
			typescript: {
				project
			}
		}
	},
	ignorePatterns: ['.*.js', 'node_modules/'],
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
};
