import nextConfigs from '@ever-teams/eslint-config/next.mjs';
import rootConfig from '../../../../eslint.config.mjs';

/**
 * ESLint 9 flat config, replacing .eslintrc.js, whose `parseOptions` (a typo eslintrc rejected) becomes the intended
 * `parserOptions`. It was not `root: true`, so eslintrc merged the repository root config under it: flat config does
 * not cascade, so it is imported explicitly.
 */
export default [
	...rootConfig,
	...nextConfigs,
	{
		// Type-aware parsing for the TypeScript files (`eslint .` also lints the JavaScript config files).
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			sourceType: 'module',
			parserOptions: {
				project: 'tsconfig.json',
				tsconfigRootDir: import.meta.dirname
			}
		}
	}
];
