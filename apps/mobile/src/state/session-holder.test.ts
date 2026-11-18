import { createStore } from 'jotai';
import { keepStoredSessionInOrder, readStoredSession } from '../../app/services/client/secure-session';
import { load, save } from '../../app/utils/storage';
import { forgetEndedSession, keepRenewedPair, sessionHolderOf } from './session-holder';
import { sessionAtom } from './session';

jest.mock('../../app/services/client/secure-session', () => ({
	...jest.requireActual('../../app/services/client/secure-session'),
	keepStoredSessionInOrder: jest.fn(async () => undefined),
	readStoredSession: jest.fn(async () => ({}))
}));
jest.mock('../../app/utils/storage', () => ({ load: jest.fn(async () => null), save: jest.fn(async () => true) }));

const kofi = { accessToken: 'access-1', refreshToken: 'refresh-1', tenantId: 'tenant', organizationId: 'organization' };
// What a version before the secure storage saved: the tokens in the authentication store's state
const earlierSnapshot = {
	authenticationStore: {
		authToken: 'access-1',
		refreshToken: 'refresh-1',
		tenantId: 'tenant',
		organizationId: 'organization'
	}
};
const snapshotWithoutTokens = { authenticationStore: { tenantId: 'tenant', organizationId: 'organization' } };

function signedInStore() {
	const store = createStore();
	store.set(sessionAtom, { status: 'signed-in', session: kofi });
	return store;
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe('the session the HTTP client renews in the new app', () => {
	it('gives the tokens of the person signed in', () => {
		const holder = sessionHolderOf(signedInStore(), jest.fn());

		expect(holder.tokens()).toEqual({ accessToken: 'access-1', refreshToken: 'refresh-1' });
	});

	it('gives no token when nobody is signed in', () => {
		const store = createStore();
		store.set(sessionAtom, { status: 'signed-out' });

		expect(sessionHolderOf(store, jest.fn()).tokens()).toEqual({ accessToken: undefined, refreshToken: undefined });
	});

	it('keeps a renewed pair for the screens and in secure storage, with the workspace', () => {
		const store = signedInStore();

		sessionHolderOf(store, jest.fn()).keep({ accessToken: 'access-2', refreshToken: 'refresh-2' });

		expect(store.get(sessionAtom)).toEqual({
			status: 'signed-in',
			session: { ...kofi, accessToken: 'access-2', refreshToken: 'refresh-2' }
		});
		expect(keepStoredSessionInOrder).toHaveBeenCalledWith({ accessToken: 'access-2', refreshToken: 'refresh-2' });
	});

	it('keeps the refresh token it holds when the renewal answers none', () => {
		const store = signedInStore();

		sessionHolderOf(store, jest.fn()).keep({ accessToken: 'access-2' });

		expect(keepStoredSessionInOrder).toHaveBeenCalledWith({ accessToken: 'access-2', refreshToken: 'refresh-1' });
	});

	it("ends the session: signed out, tokens forgotten, the person's data dropped", () => {
		const store = signedInStore();
		const forgetData = jest.fn();

		sessionHolderOf(store, forgetData).end();

		expect(store.get(sessionAtom)).toEqual({ status: 'signed-out' });
		expect(keepStoredSessionInOrder).toHaveBeenCalledWith({});
		expect(forgetData).toHaveBeenCalledTimes(1);
	});
});

describe('the tokens an earlier version saved', () => {
	it('leave the saved state once secure storage holds the renewed pair, so the next start reads that pair', async () => {
		(load as jest.Mock).mockResolvedValue(earlierSnapshot);
		(readStoredSession as jest.Mock).mockResolvedValue({ accessToken: 'access-2', refreshToken: 'refresh-2' });

		await keepRenewedPair({ accessToken: 'access-2', refreshToken: 'refresh-2' });

		expect(save).toHaveBeenCalledWith('root-v1', snapshotWithoutTokens);
	});

	it('stay while secure storage does not hold the renewed pair, so the session is not lost', async () => {
		(load as jest.Mock).mockResolvedValue(earlierSnapshot);
		(readStoredSession as jest.Mock).mockRejectedValue(new Error('keystore unavailable'));

		await keepRenewedPair({ accessToken: 'access-2', refreshToken: 'refresh-2' });

		expect(save).not.toHaveBeenCalled();
	});

	it('leave the saved state when the session ends, so it stays ended', async () => {
		(load as jest.Mock).mockResolvedValue(earlierSnapshot);

		await forgetEndedSession();

		expect(keepStoredSessionInOrder).toHaveBeenCalledWith({});
		expect(save).toHaveBeenCalledWith('root-v1', snapshotWithoutTokens);
	});

	it('leave nothing to write when the saved state carries none', async () => {
		(load as jest.Mock).mockResolvedValue(snapshotWithoutTokens);

		await forgetEndedSession();

		expect(save).not.toHaveBeenCalled();
	});
});
