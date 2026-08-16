// we always make sure 'react-native' gets included first
import * as ReactNative from 'react-native';
import mockFile from './mockFile';

// libraries to mock
jest.doMock('react-native', () => {
	// Extend ReactNative
	return Object.setPrototypeOf(
		{
			Image: {
				...ReactNative.Image,
				resolveAssetSource: jest.fn((_source) => mockFile), // eslint-disable-line @typescript-eslint/no-unused-vars
				getSize: jest.fn(
					(
						uri: string, // eslint-disable-line @typescript-eslint/no-unused-vars
						success: (width: number, height: number) => void,
						failure?: (_error: any) => void // eslint-disable-line @typescript-eslint/no-unused-vars
					) => success(100, 100)
				)
			}
		},
		ReactNative
	);
});

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
