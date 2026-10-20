import nextConfigs from '@ever-teams/eslint-config/next.mjs';
import storybook from 'eslint-plugin-storybook';
import rootConfig from '../../eslint.config.mjs';

/**
 * ESLint 9 flat config, replacing .eslintrc.json. The old config extended `@ever-teams/eslint-config/nextjs.json`,
 * which @ever-teams/eslint-config never shipped: it now uses the package's Next.js config, then Storybook's recommended
 * rules as before. It was not `root: true`, so eslintrc merged the repository root config under it: flat config does
 * not cascade, so it is imported explicitly.
 */
export default [...rootConfig, ...nextConfigs, ...storybook.configs['flat/recommended']];
