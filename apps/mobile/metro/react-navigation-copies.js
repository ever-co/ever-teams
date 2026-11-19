// The app runs on Expo Router, which ships its own copy of React Navigation. The current screens, and the libraries
// they use, still import @react-navigation/*: each such import resolves to Expo Router's copy, so screens and routes
// share one navigation. Expo CLI's own rewrite covers @react-navigation/core only, and not while the opt-out in
// metro.config.js is set, which the current screens' imports still need.
const PACKAGES = [
	'core',
	'native',
	'elements',
	'drawer',
	'bottom-tabs',
	'native-stack',
	'stack',
	'routers',
	'material-top-tabs'
];

const COPIES = Object.fromEntries(
	PACKAGES.map((name) => [`@react-navigation/${name}`, `expo-router/build/react-navigation/${name}`])
);

/** Expo Router's copy of a React Navigation package, or nothing for any other module. */
function expoRouterCopyOf(moduleName) {
	return COPIES[moduleName];
}

/** A Metro resolver that sends React Navigation's packages to Expo Router's copy, and every other module on. */
function withReactNavigationFromExpoRouter(resolveRequest) {
	return (context, moduleName, platform) => {
		const copy = expoRouterCopyOf(moduleName);
		const resolve = resolveRequest ?? context.resolveRequest;
		if (copy) {
			return resolve(context, copy, platform);
		}
		return resolve(context, moduleName, platform);
	};
}

module.exports = { expoRouterCopyOf, withReactNavigationFromExpoRouter };
