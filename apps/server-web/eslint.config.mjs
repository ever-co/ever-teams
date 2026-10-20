import rootConfig from '../../eslint.config.mjs';

/**
 * ESLint 9 flat config of the desktop app. It had no config of its own: eslintrc merged the repository root
 * .eslintrc.json with .erb/configs/.eslintrc and .erb/scripts/.eslintrc, and .eslintignore listed what to skip.
 * Flat config does not cascade, so all of that is here.
 *
 * The .erb configs also turned off `import/no-dynamic-require` and `import/no-extraneous-dependencies`, but no config
 * in that chain loaded eslint-plugin-import, so those entries did nothing; flat config refuses rules of a plugin it
 * does not know, so they are left out.
 */
export default [
  {
    // .eslintignore (flat config lints dot-directories such as .erb by default, which `!.erb` used to restore)
    ignores: [
      '**/logs/',
      '**/*.log',
      '**/pids/',
      '**/*.pid',
      '**/*.seed',
      '**/coverage/',
      '**/.eslintcache',
      '**/.DS_Store',
      'release/app/dist/',
      'release/build/',
      '.erb/dll/',
      '**/.idea/',
      '**/npm-debug.log.*',
      '**/*.css.d.ts',
      '**/*.sass.d.ts',
      '**/*.scss.d.ts',
    ],
  },
  ...rootConfig,
  {
    // .erb/configs/.eslintrc and .erb/scripts/.eslintrc
    files: ['.erb/configs/**', '.erb/scripts/**'],
    rules: {
      'no-console': 'off',
      'global-require': 'off',
    },
  },
];
