import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import rootConfig from '../../../eslint.config.mjs';

/**
 * ESLint 9 flat config, replacing .eslintrc.json (`extends: next/core-web-vitals`). It was not `root: true`, so
 * eslintrc merged the repository root config under it: flat config does not cascade, so it is imported explicitly.
 */
export default [
	{
		ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts']
	},
	...rootConfig,
	...nextCoreWebVitals
];
