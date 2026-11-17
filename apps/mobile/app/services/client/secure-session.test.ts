/**
 * The session's tokens are kept in expo-secure-store (Keychain / Android Keystore), never in AsyncStorage.
 */
import * as SecureStore from 'expo-secure-store';
import {
	forgetStoredSession,
	hasTokens,
	keepStoredSessionInOrder,
	moveSessionToSecureStorage,
	readStoredSession,
	writeStoredSession
} from './secure-session';

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
	// a test that replaced the implementation and failed must not leave its waiting writes to the next ones
	jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key: string, value: string) => {
		mockSecureValues.set(key, value);
	});
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

	it('still deletes the refresh token when the access token cannot be deleted', async () => {
		await writeStoredSession({ accessToken: 'access-1', refreshToken: 'refresh-1' });
		jest.mocked(SecureStore.deleteItemAsync).mockRejectedValueOnce(new Error('keystore unavailable'));

		await forgetStoredSession();

		expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('ever-teams.session.refresh-token');
		expect(mockSecureValues.has('ever-teams.session.refresh-token')).toBe(false);
	});

	it('tells whether a session has any token', () => {
		expect(hasTokens({})).toBe(false);
		expect(hasTokens({ accessToken: '' })).toBe(false);
		expect(hasTokens({ refreshToken: 'refresh-1' })).toBe(true);
	});

	it('keeps the latest pair when an earlier save finishes last', async () => {
		// Each native write waits until the test finishes it; the newest waiting write is finished first, which is the
		// order that leaves a stale refresh token when two saves run side by side.
		const waiting: Array<() => void> = [];
		jest.mocked(SecureStore.setItemAsync).mockImplementation(
			(key: string, value: string) =>
				new Promise<void>((resolve) => {
					waiting.push(() => {
						mockSecureValues.set(key, value);
						resolve();
					});
				})
		);
		const flush = async () => {
			for (let i = 0; i < 10; i++) {
				await Promise.resolve();
			}
		};

		const first = keepStoredSessionInOrder({ accessToken: 'access-new', refreshToken: 'refresh-old' });
		const second = keepStoredSessionInOrder({ accessToken: 'access-new', refreshToken: 'refresh-new' });
		for (let i = 0; i < 10; i++) {
			await flush();
			waiting.pop()?.();
		}
		await Promise.race([Promise.all([first, second]), flush()]);

		expect(mockSecureValues.get('ever-teams.session.refresh-token')).toBe('refresh-new');
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

		it('forgets the token it saved when the second write is refused, so a sign-out cannot be undone', async () => {
			jest.mocked(SecureStore.setItemAsync)
				.mockImplementationOnce(async (key: string, value: string) => {
					mockSecureValues.set(key, value);
				})
				.mockRejectedValueOnce(new Error('keystore unavailable'));

			const moved = await moveSessionToSecureStorage({ accessToken: 'access-1', refreshToken: 'refresh-1' });

			expect(moved).toBe(false);
			expect(mockSecureValues.size).toBe(0);
		});

		it('fails when the value read back differs from the one written', async () => {
			jest.mocked(SecureStore.getItemAsync).mockResolvedValueOnce('another-token');

			const moved = await moveSessionToSecureStorage({ accessToken: 'access-1', refreshToken: 'refresh-1' });

			expect(moved).toBe(false);
		});
	});
});
