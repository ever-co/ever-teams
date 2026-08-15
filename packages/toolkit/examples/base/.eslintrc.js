module.exports = {
	extends: ['@ever-teams/eslint-config/next.js'],
	parseOptions: {
		project: 'tsconfig.json',
		tsconfigRootDir: __dirname,
		sourceType: 'module'
	}
};
