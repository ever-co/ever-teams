import js from '@eslint/js';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';

/**
 * ESLint 9 flat config of apps/web. Run it with `yarn workspace @ever-teams/web lint` (CI: `nx run web:lint`).
 *
 * eslint-config-next's `core-web-vitals` and `typescript` configs lint every .js/.jsx/.ts/.tsx file (Next,
 * React, hooks, a11y, import and typescript-eslint rules). Violations that predate them are recorded in
 * eslint-suppressions.json, so every rule applies to new code while the backlog is burned down: see
 * "Linting" in README.md.
 */
const eslintConfig = [
	{
		ignores: ['**/.next/**', '**/build/**', '**/coverage/**', '**/dist/**', '**/node_modules/**', '**/out/**']
	},
	js.configs.recommended,
	...nextVitals,
	...nextTypescript,
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
		// The '@next/next' plugin comes with eslint-config-next (registering it again throws).
		plugins: {
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
	},
	{
		// eslint-plugin-unused-imports builds on the first @typescript-eslint/eslint-plugin it can load, which
		// is the root's 5.60 (pinned for the root ESLint 8): its rule crashes on TypeScript under ESLint 9. For
		// .ts/.tsx, typescript-eslint 8's @typescript-eslint/no-unused-vars (from the typescript config) reports
		// unused imports and variables instead.
		files: ['**/*.{ts,tsx,mts,cts}'],
		rules: {
			'unused-imports/no-unused-imports': 'off',
			'unused-imports/no-unused-vars': 'off'
		}
	},
	{
		// `lint` fails on any warning (--max-warnings=0), and eslint-suppressions.json only records errors: these
		// rules, which eslint-config-next sets to warn and which have a backlog, are errors so it can be recorded.
		rules: {
			'@next/next/no-head-element': 'error',
			'@typescript-eslint/no-unused-expressions': 'error',
			'@typescript-eslint/no-unused-vars': 'error',
			'import/no-anonymous-default-export': 'error',
			'jsx-a11y/role-has-required-aria-props': 'error',
			'react-hooks/exhaustive-deps': 'error',
			'react-hooks/incompatible-library': 'error'
		}
	},
	{
		// JavaScript keeps the rules it had before eslint-config-next's typescript config (which applies
		// typescript-eslint to every file): core no-unused-vars next to unused-imports, and require() in the
		// CommonJS config files (this package has no "type": "module").
		files: ['**/*.{js,jsx,mjs,cjs}'],
		rules: {
			'@typescript-eslint/no-unused-vars': 'off',
			'no-unused-vars': 'error'
		}
	},
	{
		files: ['**/*.{js,cjs}'],
		rules: {
			'@typescript-eslint/no-require-imports': 'off'
		}
	},
	{
		// The code carries eslint-disable comments for rules that are not enabled (no-console,
		// no-mixed-spaces-and-tabs, the old @typescript-eslint/no-var-requires...). Reporting them is off until
		// they are cleaned up (README.md, "Linting").
		linterOptions: {
			reportUnusedDisableDirectives: 'off'
		}
	}
];

export default eslintConfig;
