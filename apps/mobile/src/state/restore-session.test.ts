import { restoreSessionState } from './restore-session';

jest.mock('expo-secure-store', () => jest.requireActual('../../test/secure-store-mock').secureStoreMock);

const signedIn = { authenticationStore: { tenantId: 'tenant-1', organizationId: 'org-1', user: { id: 'user-1' } } };
const afterSignOut = { authenticationStore: { tenantId: '', organizationId: '', user: undefined } };
const secureTokens = { accessToken: 'secure-access', refreshToken: 'secure-refresh' };

function readStoredOf(tokens: { accessToken?: string; refreshToken?: string }) {
	return jest.fn(async () => tokens);
}

describe('the session the new app restores', () => {
	it('is the one in the secure storage while the snapshot says someone is signed in', async () => {
		const state = await restoreSessionState(signedIn, readStoredOf(secureTokens));

		expect(state).toEqual({
			status: 'signed-in',
			session: {
				accessToken: 'secure-access',
				refreshToken: 'secure-refresh',
				tenantId: 'tenant-1',
				organizationId: 'org-1'
			}
		});
	});

	it('refuses tokens left in the secure storage after a sign-out', async () => {
		const readStored = readStoredOf(secureTokens);

		const state = await restoreSessionState(afterSignOut, readStored);

		expect(state).toEqual({ status: 'signed-out' });
		expect(readStored).not.toHaveBeenCalled();
	});

	it('refuses tokens left in the secure storage when nothing was saved', async () => {
		expect(await restoreSessionState(null, readStoredOf(secureTokens))).toEqual({ status: 'signed-out' });
	});

	it('keeps the tokens an earlier version left in the snapshot', async () => {
		const snapshot = {
			authenticationStore: {
				...signedIn.authenticationStore,
				authToken: 'old-access',
				refreshToken: 'old-refresh'
			}
		};
		const readStored = readStoredOf({});

		const state = await restoreSessionState(snapshot, readStored);

		expect(state).toEqual({
			status: 'signed-in',
			session: {
				accessToken: 'old-access',
				refreshToken: 'old-refresh',
				tenantId: 'tenant-1',
				organizationId: 'org-1'
			}
		});
		expect(readStored).not.toHaveBeenCalled();
	});

	it('is signed out when someone was signed in but the secure storage is empty', async () => {
		expect(await restoreSessionState(signedIn, readStoredOf({}))).toEqual({ status: 'signed-out' });
	});
});
