import baseConfig from '@ever-teams/eslint-config/base.mjs';
import rootConfig from '../../eslint.config.mjs';

/**
 * ESLint 9 flat config, replacing .eslintrc.json and .eslintignore. The old config was not `root: true`, so eslintrc
 * merged the repository root config under it: flat config does not cascade, so it is imported explicitly.
 */
export default [
	{
		ignores: ['dist/**', 'build/**', 'out/**'],
	},
	...rootConfig,
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
