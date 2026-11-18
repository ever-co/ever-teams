const { expoRouterCopyOf, withReactNavigationFromExpoRouter } = require('./react-navigation-copies');

describe('the React Navigation the app bundles', () => {
	it("is Expo Router's copy, for the current screens' imports and the libraries'", () => {
		expect(expoRouterCopyOf('@react-navigation/native')).toBe('expo-router/build/react-navigation/native');
		expect(expoRouterCopyOf('@react-navigation/drawer')).toBe('expo-router/build/react-navigation/drawer');
		expect(expoRouterCopyOf('@react-navigation/bottom-tabs')).toBe(
			'expo-router/build/react-navigation/bottom-tabs'
		);
		expect(expoRouterCopyOf('@react-navigation/core')).toBe('expo-router/build/react-navigation/core');
	});

	it('leaves every other module as it is', () => {
		expect(expoRouterCopyOf('react-native')).toBeUndefined();
		expect(expoRouterCopyOf('expo-router')).toBeUndefined();
	});

	it('resolves through the resolver it wraps, or else through Metro', () => {
		const metro = jest.fn(() => ({ type: 'sourceFile' }));
		const context = { resolveRequest: metro };

		withReactNavigationFromExpoRouter(undefined)(context, '@react-navigation/native', 'android');
		withReactNavigationFromExpoRouter(undefined)(context, 'react-native', 'android');

		expect(metro).toHaveBeenNthCalledWith(1, context, 'expo-router/build/react-navigation/native', 'android');
		expect(metro).toHaveBeenNthCalledWith(2, context, 'react-native', 'android');
	});
});
