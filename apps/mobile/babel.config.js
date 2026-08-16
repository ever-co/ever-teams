/** @type {import('@babel/core').TransformOptions['plugins']} */
const plugins = [
	[
		'module:react-native-dotenv',
		{
			moduleName: '@env',
			path: '.env'
		}
	],
	// Reanimated 4 moved its worklet transform into react-native-worklets. The old
	// 'react-native-reanimated/plugin' entry is now only a shim that requires this one, and
	// it fails hard when react-native-worklets is absent ("Cannot find module
	// 'react-native-worklets/plugin'" — the exact error the first SDK 57 Android bundle hit).
	// This must stay the LAST plugin in the list.
	'react-native-worklets/plugin'
];

/** @type {import('@babel/core').TransformOptions} */
module.exports = function (api) {
	api.cache(true);
	return {
		presets: ['babel-preset-expo'],
		plugins
	};
};
