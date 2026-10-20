import baseConfig from "@ever-teams/eslint-config/base.mjs";

/**
 * ESLint 9 flat config, replacing .eslintrc.json (`root: true`, extends @ever-teams/eslint-config/base) and
 * .eslintignore.
 */
export default [
	{
		ignores: ["dist/**", "build/**", "out/**"],
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
