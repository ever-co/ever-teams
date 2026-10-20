import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Root ESLint 9 flat config, replacing .eslintrc.json. It lints the packages that have no config of their own
 * (packages/constants, packages/types). The packages whose .eslintrc was not `root: true` used to get it merged under
 * their own config by eslintrc; flat config does not cascade, so their eslint.config.mjs imports it.
 *
 * Converted with `nx g @nx/eslint:convert-to-flat-config`, then made flat-native (no FlatCompat shim). Left out, because
 * flat config refuses a rule it cannot find while eslintrc ignored such rules when they were `off`:
 * - `@typescript-eslint/camelcase`, `ban-ts-ignore` and `interface-name-prefix`, removed in typescript-eslint 3;
 * - `jsx-a11y/no-onchange`, `import/prefer-default-export` and `import/no-extraneous-dependencies`, whose plugins this
 *   config never loaded.
 *
 * @type {import('eslint').Linter.Config[]}
 */
export default [
	js.configs.recommended,
	reactPlugin.configs.flat.recommended,
	...tseslint.configs.recommended,
	{
		settings: {
			react: {
				version: 'detect'
			}
		},
		languageOptions: {
			parserOptions: {
				ecmaFeatures: {
					jsx: true
				},
				ecmaVersion: 13,
				sourceType: 'module'
			},
			globals: { ...globals.browser, ...globals.es2021 }
		}
	},
	{
		rules: {
			camelcase: 'off',
			'@typescript-eslint/no-explicit-any': [
				'off',
				{
					ignoreRestArgs: true
				}
			],
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'react/jsx-props-no-spreading': 'off',
			'react/prop-types': 'off',
			'@typescript-eslint/no-unused-vars': 'warn',
			'react/react-in-jsx-scope': 'off',
			'@typescript-eslint/ban-ts-comment': 'off'
		}
	},
	{
		// Enforced by the eslintrc config through the ESLint 8 and typescript-eslint 5 recommended presets, which ESLint
		// 9 and typescript-eslint 8 dropped them from (typescript-eslint moved them to its stylistic and strict presets):
		// kept so that the upgrade does not stop enforcing them.
		rules: {
			'no-inner-declarations': 'error',
			'@typescript-eslint/adjacent-overload-signatures': 'error',
			'@typescript-eslint/no-empty-function': 'error',
			'@typescript-eslint/no-inferrable-types': 'error',
			'@typescript-eslint/no-non-null-assertion': 'warn'
		}
	}
];
