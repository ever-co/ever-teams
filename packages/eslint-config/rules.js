/**
 * House rules of @ever-teams/eslint-config, shared by the eslintrc presets (base.js, next.js) and their ESLint 9 flat
 * config twins (base.mjs, next.mjs). CommonJS, so that both formats can load it.
 */

/** Rules that the base and next presets both set, to the same values. */
const commonRules = {
	'arrow-body-style': ['error', 'as-needed'],
	'no-useless-escape': 'off',
	'no-irregular-whitespace': 'error',
	'no-trailing-spaces': 'error',
	'no-useless-catch': 'warn',
	'no-case-declarations': 'error',
	'no-duplicate-imports': 'error',
	'no-unreachable': 'error',
	'no-undef': 'error',
	'prefer-const': 'error',
	'react/jsx-boolean-value': 'error',
	'react/jsx-key': 'error',
	'react/self-closing-comp': ['error', { component: true, html: true }],
	'react/jsx-no-duplicate-props': 'error',
	'@typescript-eslint/no-unused-vars': ['warn'],
	'@typescript-eslint/no-explicit-any': 'warn',
	'@typescript-eslint/no-useless-empty-export': 'error',
	'@typescript-eslint/no-unused-expressions': 'warn',
	'@typescript-eslint/prefer-ts-expect-error': 'warn'
};

/** `import/order` with the house groups, in alphabetical order; `pathGroups` place the workspace's own imports. */
const importOrder = (severity, pathGroups) => [
	severity,
	{
		groups: ['builtin', 'external', 'internal', 'parent', 'sibling'],
		pathGroups,
		pathGroupsExcludedImportTypes: ['builtin', 'internal', 'react'],
		alphabetize: {
			order: 'asc',
			caseInsensitive: true
		}
	}
];

const basePathGroups = [
	{
		pattern: '@ever-teams/**',
		group: 'external',
		position: 'after'
	},
	{
		pattern: '@/**',
		group: 'internal',
		position: 'before'
	}
];

const nextPathGroups = [
	{
		pattern: 'react',
		group: 'external',
		position: 'before'
	},
	{
		pattern: 'lucide-react',
		group: 'external',
		position: 'after'
	},
	{
		pattern: '@ever-teams/**',
		group: 'external',
		position: 'after'
	},
	{
		pattern: '@/**',
		group: 'internal'
	}
];

/**
 * Enforced by the eslintrc presets through typescript-eslint 5's recommended preset, which typescript-eslint 8 dropped
 * them from (moved to its stylistic and strict presets; `@typescript-eslint/no-loss-of-precision` was removed for the
 * core rule): the flat presets set them so that the upgrade does not stop enforcing them.
 */
const typescriptEslint5RecommendedRules = {
	'no-loss-of-precision': 'error',
	'@typescript-eslint/adjacent-overload-signatures': 'error',
	'@typescript-eslint/no-empty-function': 'error',
	'@typescript-eslint/no-inferrable-types': 'error',
	'@typescript-eslint/no-non-null-assertion': 'warn'
};

module.exports = {
	commonRules,
	importOrder,
	basePathGroups,
	nextPathGroups,
	typescriptEslint5RecommendedRules
};
