// we always make sure 'react-native' gets included first

// libraries to mock
// The Ignite boilerplate re-mocked the ENTIRE 'react-native' module here to stub Image.getSize /
// resolveAssetSource. Under React Native 0.86 that cannot be done safely: wrapping the module in
// Object.setPrototypeOf broke @testing-library/react-native's host-component detection, and
// spreading it ({...ReactNative}) eagerly evaluates every lazy TurboModule getter (DevMenu,...),
// which throws outside a native binary. jest-expo already ships working RN mocks, and only
// components/auto-image.tsx touches those two Image statics, so no global override is needed.
// If a test needs deterministic Image sizes, mock 'react-native/Libraries/Image/Image' in that
// test file.

// The mock is required INSIDE the factory. babel-jest hoists jest.mock() above every import, so
// a factory that closes over an imported binding (`import mockAsyncStorage from ...`) fails with
// "The module factory of `jest.mock()` is not allowed to reference any out-of-scope variables"
// — which is exactly what took all four suites down after the jest-expo 57 upgrade.
jest.mock('@react-native-async-storage/async-storage', () =>
	require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('i18n-js', () => ({
	currentLocale: () => 'en',
	t: (key: string, params: Record<string, string>) => {
		return `${key} ${JSON.stringify(params)}`;
	}
}));

declare const tron; // eslint-disable-line @typescript-eslint/no-unused-vars

jest.useFakeTimers();
declare global {
	let __TEST__;
}
