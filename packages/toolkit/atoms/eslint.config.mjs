import baseConfig from '@ever-teams/eslint-config/base.mjs';
import rootConfig from '../../../eslint.config.mjs';

/**
 * ESLint 9 flat config, replacing .eslintrc.cjs. The old config extended `@ever-teams/eslint-config/react.js`, which
 * @ever-teams/eslint-config never shipped, and set `parseOptions` (a typo eslintrc rejected, so lint crashed): it now
 * uses the package's base config and the intended `parserOptions.tsconfigRootDir`. It was not `root: true`, so
 * eslintrc merged the repository root config under it: flat config does not cascade, so it is imported explicitly.
 */
export default [
	...rootConfig,
	...baseConfig,
	{
		languageOptions: {
			parserOptions: {
				tsconfigRootDir: import.meta.dirname
			}
		}
	}
];
