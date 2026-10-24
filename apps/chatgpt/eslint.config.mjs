import baseConfig from '@ever-teams/eslint-config/base.mjs';
import rootConfig from '../../eslint.config.mjs';

/**
 * ESLint 9 flat config, replacing .eslintrc.js (CommonJS in a `"type": "module"` package, so ESLint could not load
 * it). The old config extended `@ever-teams/eslint-config/library.js`, which @ever-teams/eslint-config never shipped:
 * it now uses the package's base config. It was not `root: true`, so eslintrc merged the repository root config under
 * it: flat config does not cascade, so it is imported explicitly.
 */
export default [
	...rootConfig,
	...baseConfig,
	{
		languageOptions: {
			sourceType: 'module',
			parserOptions: {
				project: 'tsconfig.json',
				tsconfigRootDir: import.meta.dirname
			}
		}
	}
];
