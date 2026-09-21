import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';

const eslintConfig = [
	{
		ignores: ['**/.next/**', '**/build/**', '**/coverage/**', '**/dist/**', '**/node_modules/**', '**/out/**']
	},
	js.configs.recommended,
	{
		files: ['**/*.config.js', '**/env.js'],
		languageOptions: {
			globals: {
				__dirname: 'readonly',
				console: 'readonly',
				module: 'readonly',
				process: 'readonly',
				require: 'readonly'
			}
		}
	},
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
