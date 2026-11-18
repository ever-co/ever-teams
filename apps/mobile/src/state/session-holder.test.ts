import { createStore } from 'jotai';
import { keepStoredSessionInOrder } from '../../app/services/client/secure-session';
import { sessionHolderOf } from './session-holder';
import { sessionAtom } from './session';

jest.mock('../../app/services/client/secure-session', () => ({
	keepStoredSessionInOrder: jest.fn(async () => undefined)
}));

const kofi = { accessToken: 'access-1', refreshToken: 'refresh-1', tenantId: 'tenant', organizationId: 'organization' };

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
