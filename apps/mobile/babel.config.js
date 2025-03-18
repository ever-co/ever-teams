/** @type {import('@babel/core').TransformOptions['plugins']} */
const plugins = [
	[
		'module:react-native-dotenv',
		{
			moduleName: '@env',
			path: '.env'
		}
	],
	'react-native-reanimated/plugin'
];

/** @type {import('@babel/core').TransformOptions} */
module.exports = function (api) {
	api.cache(true);
	return {
		presets: ['babel-preset-expo'],
		plugins
	};
};
