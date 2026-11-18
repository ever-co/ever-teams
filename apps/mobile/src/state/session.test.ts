import { createStore } from 'jotai';
import { isSignedInAtom, sessionAtom, sessionStateFrom } from './session';

describe('the session state', () => {
	it('is signed in with an access token, and keeps the workspace', () => {
		const state = sessionStateFrom({ accessToken: 'access-1', refreshToken: 'refresh-1', tenantId: 'tenant-1' });

		expect(state).toEqual({
			status: 'signed-in',
			session: {
				accessToken: 'access-1',
				refreshToken: 'refresh-1',
				tenantId: 'tenant-1',
				organizationId: undefined
			}
		});
	});

	it('is signed out without an access token, even with a refresh token left', () => {
		expect(sessionStateFrom({ refreshToken: 'refresh-1' })).toEqual({ status: 'signed-out' });
		expect(sessionStateFrom(null)).toEqual({ status: 'signed-out' });
	});

	it('tells the screens whether someone is signed in', () => {
		const store = createStore();
		expect(store.get(isSignedInAtom)).toBe(false);

		store.set(sessionAtom, sessionStateFrom({ accessToken: 'access-1' }));

		expect(store.get(isSignedInAtom)).toBe(true);
	});
});
