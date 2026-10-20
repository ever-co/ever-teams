import js from '@eslint/js';
import globals from 'globals';

/**
 * ESLint 9 flat config equivalent of server.js (the eslintrc config): `import server from '@ever-teams/eslint-config/server.mjs'`
 * and spread it into the package's eslint.config.mjs.
 *
 * @type {import('eslint').Linter.Config[]}
 */
const serverConfig = [
	js.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				...globals.node,
				...globals.es2015
			}
		}
	}
];

export default serverConfig;
