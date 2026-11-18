/**
 * An in-memory expo-secure-store for the tests of the session's storage:
 *   jest.mock('expo-secure-store', () => jest.requireActual('<path>/test/secure-store-mock').secureStoreMock);
 */
export const mockSecureValues = new Map<string, string>();

export const secureStoreMock = {
	setItemAsync: jest.fn(async (key: string, value: string) => {
		mockSecureValues.set(key, value);
	}),
	getItemAsync: jest.fn(async (key: string) => mockSecureValues.get(key) ?? null),
	deleteItemAsync: jest.fn(async (key: string) => {
		mockSecureValues.delete(key);
	})
};
