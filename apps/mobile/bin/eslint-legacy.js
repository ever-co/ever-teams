#!/usr/bin/env node
/**
 * Runs this app's ESLint 8 with its eslintrc config (`eslintConfig` in package.json).
 *
 * ESLint 8 switches to flat config as soon as it finds an eslint.config.* file in any parent directory, and the
 * repository root has one since it moved to ESLint 9, so `ESLINT_USE_FLAT_CONFIG=false` keeps this app on its own
 * config (and its `--ext` option, which flat mode rejects). Arguments are passed through to ESLint.
 */
const path = require('node:path');

process.env.ESLINT_USE_FLAT_CONFIG = 'false';

require(path.join(path.dirname(require.resolve('eslint/package.json')), 'bin', 'eslint.js'));
