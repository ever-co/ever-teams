import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';

const eslintConfig = [
	js.configs.recommended,
	{
		plugins: {
			'@next/next': nextPlugin,
			'unused-imports': unusedImportsPlugin
		},
		rules: {
			'@next/next/no-html-link-for-pages': 'off',
			'react/display-name': 'off',
			'@next/next/no-img-element': 'off',
			'unused-imports/no-unused-imports': 'error',
			'unused-imports/no-unused-vars': [
				'warn',
				{
					vars: 'all',
					varsIgnorePattern: '^_',
					args: 'after-used',
					argsIgnorePattern: '^_'
				}
			]
		}
	}
];

export default eslintConfig;
