import baseConfig from '@ever-teams/eslint-config/base.mjs';

/**
 * ESLint 9 flat config, replacing .eslintrc.json and .eslintignore. The old config was `root: true` and extended
 * `@ever-teams/eslint-config/library`, which @ever-teams/eslint-config never shipped (lint crashed on it); it now uses
 * the package's base config, like services, ui and utils.
 */
export default [
	{
		ignores: ['dist/**', 'build/**', 'out/**'],
	},
	...baseConfig,
	{
		languageOptions: {
			parserOptions: {
				project: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
];
