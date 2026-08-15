module.exports = {
	extends: ['@ever-teams/eslint-config/library.js'],
	parserOptions: {
		project: 'tsconfig.json',
		tsconfigRootDir: __dirname,
		sourceType: 'module'
	}
};
