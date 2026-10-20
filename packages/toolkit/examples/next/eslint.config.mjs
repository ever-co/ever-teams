import nextConfigs from '@ever-teams/eslint-config/next.mjs';
import rootConfig from '../../../../eslint.config.mjs';

/**
 * ESLint 9 flat config. This file held a copy of examples/base/.eslintrc.js written as
 * CommonJS (`module.exports`), which an .mjs file cannot use, so ESLint crashed on it.
 * It is now the flat config examples/base uses, with the intended `parserOptions` instead of the `parseOptions` typo.
 * The earlier, commented-out config is kept below.
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

// import { dirname } from "path";
// import { fileURLToPath } from "url";
// import { FlatCompat } from "@eslint/eslintrc";
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);
// const compat = new FlatCompat({
//   baseDirectory: __dirname,
// });
// const eslintConfig = [
//   ...compat.extends("next/core-web-vitals", "next/typescript"),
// ];
// export default eslintConfig;
