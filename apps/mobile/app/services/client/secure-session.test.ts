/**
 * The session's tokens are kept in expo-secure-store (Keychain / Android Keystore), never in AsyncStorage.
 */
import * as SecureStore from 'expo-secure-store';
import { hasTokens, moveSessionToSecureStorage, readStoredSession, writeStoredSession } from './secure-session';

const mockSecureValues = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
	setItemAsync: jest.fn(async (key: string, value: string) => {
		mockSecureValues.set(key, value);
	}),
	getItemAsync: jest.fn(async (key: string) => mockSecureValues.get(key) ?? null),
	deleteItemAsync: jest.fn(async (key: string) => {
		mockSecureValues.delete(key);
	})
}));

beforeEach(() => {
	mockSecureValues.clear();
	jest.clearAllMocks();
});

describe('secure session storage', () => {
	it('reads back the tokens it wrote', async () => {
		await writeStoredSession({ accessToken: 'access-1', refreshToken: 'refresh-1' });

		await expect(readStoredSession()).resolves.toEqual({ accessToken: 'access-1', refreshToken: 'refresh-1' });
	});

	it('reads an empty session when nothing was stored', async () => {
		await expect(readStoredSession()).resolves.toEqual({ accessToken: undefined, refreshToken: undefined });
	});

	it('forgets a token written as empty, as signing out does', async () => {
		await writeStoredSession({ accessToken: 'access-1', refreshToken: 'refresh-1' });

		await writeStoredSession({ accessToken: '', refreshToken: '' });

		expect(mockSecureValues.size).toBe(0);
		expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(2);
	});

	it('tells whether a session has any token', () => {
		expect(hasTokens({})).toBe(false);
		expect(hasTokens({ accessToken: '' })).toBe(false);
		expect(hasTokens({ refreshToken: 'refresh-1' })).toBe(true);
	});

	describe('moving a session in', () => {
		it('succeeds when the secure storage holds exactly the session afterwards', async () => {
			const moved = await moveSessionToSecureStorage({ accessToken: 'access-1', refreshToken: 'refresh-1' });

			expect(moved).toBe(true);
			expect(mockSecureValues.size).toBe(2);
		});

		it('fails when the write is refused', async () => {
			jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('keystore unavailable'));

			const moved = await moveSessionToSecureStorage({ accessToken: 'access-1', refreshToken: 'refresh-1' });

			expect(moved).toBe(false);
		});

		it('fails when the value read back differs from the one written', async () => {
			jest.mocked(SecureStore.getItemAsync).mockResolvedValueOnce('another-token');

			const moved = await moveSessionToSecureStorage({ accessToken: 'access-1', refreshToken: 'refresh-1' });

			expect(moved).toBe(false);
		});
	});
});
