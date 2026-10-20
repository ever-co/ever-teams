const { resolve } = require('node:path');
const { basePathGroups, commonRules, importOrder } = require('./rules.js');

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
		...commonRules,
		'@next/next/no-img-element': 'off',
		'@next/next/no-html-link-for-pages': 'off',
		'import/order': importOrder('warn', basePathGroups)
	},

	ignorePatterns: ['.*.js', 'node_modules/', 'dist/']
};
