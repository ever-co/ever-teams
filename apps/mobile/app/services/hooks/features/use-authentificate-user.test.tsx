/**
 * The session hook reads the profile on every screen that uses it.
 *
 * A read refused because the access token had expired signed the person out at once, although their refresh token
 * was still good. The session is now renewed behind the read. A read that stays refused, because the renewal could
 * not be made, no longer signs out either: only a refresh token the API refuses ends the session.
 *
 * And the renewal a screen asks for itself (after an e-mail is confirmed) sent the refresh token of the hook's first
 * render, kept none of the tokens Gauzy answered right, and read a refusal as a success.
 *
 * The hook, the store of the session, the requests and the HTTP client are the app's own here: only `fetch` is a
 * stand-in for Gauzy.
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { showMessage } from 'react-native-flash-message';
import { AuthenticationStore, AuthenticationStoreModel } from '../../../models/authentication-store';
import { createFakeGauzy, FakeGauzy, HOUR_MS } from '../../../../test/fake-gauzy-session';
import { currentAuthenticatedUserRequest } from '../../client/requests/auth';
import useAuthenticateUser from './use-authentificate-user';

let mockStores: Record<string, unknown> = {};

jest.mock('../../../models', () => ({ useStores: () => mockStores }));
jest.mock('react-native-flash-message', () => ({ showMessage: jest.fn() }));

const originalFetch = global.fetch;
const START = Date.parse('2026-11-14T09:00:00.000Z');

let gauzy: FakeGauzy;
let session: AuthenticationStore;

/**
 * A person signed in a while ago opens a screen that reads their profile.
 *
 * @param sinceTheSignIn What happened to the session on the API's side meanwhile.
 */
async function openScreen({
	signedInMsAgo = 0,
	sinceTheSignIn = () => undefined
}: { signedInMsAgo?: number; sinceTheSignIn?: () => void } = {}) {
	jest.setSystemTime(START - signedInMsAgo);
	const pair = gauzy.signIn();
	session = AuthenticationStoreModel.create({ user: null });
	session.setAuthToken(pair.token);
	session.setRefreshToken(pair.refresh_token);
	jest.setSystemTime(START);
	sinceTheSignIn();
	mockStores = {
		authenticationStore: session,
		teamStore: { activeTeam: null, clearStoredTeamData: jest.fn() },
		TaskStore: { resetTeamTasksData: jest.fn() }
	};
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	const { result } = await renderHook(() => useAuthenticateUser(), { wrapper });
	return { result, pair };
}

beforeEach(() => {
	(showMessage as jest.Mock).mockClear();
	jest.spyOn(console, 'error').mockImplementation(() => undefined);
	gauzy = createFakeGauzy();
	global.fetch = gauzy.fetch as unknown as typeof fetch;
});

afterEach(() => {
	global.fetch = originalFetch;
	jest.restoreAllMocks();
});

describe('the profile read of a screen, with an access token that expired', () => {
	it('shows the profile and keeps the person signed in: the session is renewed behind the read', async () => {
		await openScreen({ signedInMsAgo: 25 * HOUR_MS });

		await waitFor(() => expect(session.user?.id).toBe('user-1'));
		expect(gauzy.sentTo('POST', '/auth/refresh-token')).toHaveLength(1);
		expect(session.isAuthenticated).toBe(true);
		expect(gauzy.acceptsAccessToken(session.authToken)).toBe(true);
		expect(showMessage).not.toHaveBeenCalled();
	});

	it('keeps the person signed in when the renewal cannot be made: nothing is known about the session', async () => {
		await openScreen({ signedInMsAgo: 25 * HOUR_MS, sinceTheSignIn: () => gauzy.breakRenewals('network') });

		// The read is refused, the renewal fails, and the refusal reaches the screen
		await waitFor(() => expect(gauzy.sentTo('POST', '/auth/refresh-token')).toHaveLength(1));
		await act(async () => {
			await jest.advanceTimersByTimeAsync(1000);
		});
		expect(session.isAuthenticated).toBe(true);
		expect(session.refreshToken).toBeTruthy();
		// A refusal is not a profile
		expect(session.user).toBeNull();
		expect(showMessage).not.toHaveBeenCalled();
	});

	it('signs the person out, and tells them, when the API refuses the refresh token', async () => {
		// Signed out from another device, for instance
		await openScreen({ sinceTheSignIn: () => gauzy.endSession() });

		await waitFor(() => expect(session.isAuthenticated).toBe(false));
		expect(showMessage).toHaveBeenCalledWith(
			expect.objectContaining({ message: expect.stringContaining('session.endedTitle') })
		);
	});
});

describe('the renewal a screen asks for', () => {
	it('sends the refresh token the app holds now, keeps both tokens of the answer and shows the profile', async () => {
		const { result, pair } = await openScreen();
		await waitFor(() => expect(session.user?.id).toBe('user-1'));
		// The session was renewed since the screen opened, by a request the API refused: the token of the first render
		// is the one Gauzy rotated
		jest.setSystemTime(START + 25 * HOUR_MS);
		await currentAuthenticatedUserRequest({ bearer_token: String(session.authToken) });
		const renewedOnce = { token: session.authToken, refreshToken: session.refreshToken };
		expect(renewedOnce.refreshToken).not.toBe(pair.refresh_token);
		jest.setSystemTime(START + 26 * HOUR_MS);

		let user: unknown;
		await act(async () => {
			user = await result.current.updateUserFromAPI();
		});

		expect(user).toEqual(expect.objectContaining({ id: 'user-1' }));
		expect(session.isAuthenticated).toBe(true);
		expect(session.authToken).not.toBe(renewedOnce.token);
		expect(session.refreshToken).not.toBe(renewedOnce.refreshToken);
		expect(gauzy.acceptsAccessToken(session.authToken)).toBe(true);
		expect(gauzy.acceptsRefreshToken(session.refreshToken)).toBe(true);
	});

	it('changes nothing when it cannot be made: the person stays signed in, with the profile they had', async () => {
		const { result } = await openScreen();
		await waitFor(() => expect(session.user?.id).toBe('user-1'));
		const before = { token: session.authToken, refreshToken: session.refreshToken };
		gauzy.breakRenewals('server');

		await act(async () => {
			await result.current.updateUserFromAPI();
		});

		expect(session.authToken).toBe(before.token);
		expect(session.refreshToken).toBe(before.refreshToken);
		expect(session.user?.id).toBe('user-1');
		expect(session.isAuthenticated).toBe(true);
	});
});
