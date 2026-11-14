/** @jest-environment jsdom */
/**
 * The renewal a page asks for itself (after a team is created or left, after an invitation is accepted). When it
 * cannot be made, because the network or the API fails, nothing is known about the session: it is kept, and the
 * next renewal tries again. Only a refresh token the API refuses ends the session, and the person is told.
 *
 * Three failed renewals in a row used to sign the person out, with "Your session could not be renewed", whatever
 * made them fail.
 *
 * A session the app ends leaves a note for the sign-in page, which says why the person is on it. A sign-out the
 * person asked for leaves none.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'jotai';
import type { PropsWithChildren } from 'react';

// Direct mode, whatever NEXT_PUBLIC_GAUZY_API_SERVER_URL the env files loaded for Jest set
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	GAUZY_API_BASE_SERVER_URL: { value: 'https://api.example.test' }
}));

const mockToastError = jest.fn();

jest.mock('next/navigation', () => ({ useParams: () => ({}) }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { error: (...args: unknown[]) => mockToastError(...args) } }));
// What the app logs is sent to its own log route
jest.mock('@/core/services/logs/logger-client', () => ({ sendLogToAPI: jest.fn(async () => undefined) }));
// What the hook reads beside the session itself
jest.mock('@/core/hooks/inbox/use-inbox-web-push', () => ({ forgetThisBrowserPush: jest.fn(async () => undefined) }));
jest.mock('@/core/components/features/chat-panel/chat-history', () => ({ clearChatHistoryForUser: jest.fn() }));
jest.mock('@/core/hooks/organizations/teams/use-team-member', () => ({
	useIsMemberManager: () => ({ isTeamManager: false }),
	useIsListedTeamManager: () => false
}));
jest.mock('@/core/hooks/organizations/teams/use-active-team-member', () => ({
	useActiveTeamMemberUserId: () => undefined
}));

import { clearSessionEndedNotice, storedSessionEndedNotice } from '@/core/lib/auth/session-ended-notice';
import { getRefreshTokenCookie } from '@/core/lib/helpers/cookies';
import { authService } from '@/core/services/client/api/auth/auth.service';
import { userService } from '@/core/services/client/api/users/user.service';
import { openFakeGauzyPage, type FakeGauzyPage } from '@/test/auth/fake-gauzy-page';
import { useAuthenticateUser } from './use-authenticate-user';

let page: FakeGauzyPage;

/** A signed-in page that has read the profile, and the renewal one of its flows asks for. */
async function openSignedInPage() {
	page.signIn();
	// A failed renewal is tried once more by the hook: at once here
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retryDelay: 0 } }
	});
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={queryClient}>
			<Provider>{children}</Provider>
		</QueryClientProvider>
	);
	const { result } = renderHook(() => useAuthenticateUser(), { wrapper });
	await waitFor(() => expect(result.current.user).toBeTruthy());
	const renew = () =>
		act(async () => {
			await result.current.refreshToken().catch(() => undefined);
		});
	const signOut = () =>
		act(async () => {
			await result.current.logOut();
		});
	return { renew, signOut };
}

beforeEach(() => {
	mockToastError.mockReset();
	page = openFakeGauzyPage([authService, userService]);
});

afterEach(() => {
	clearSessionEndedNotice();
	page.close();
});

describe('a renewal the page asks for', () => {
	it.each([
		['the network fails', 'network' as const],
		['the API answers 503', 'server' as const]
	])('keeps the session however many times in a row it cannot be made, when %s', async (_case, failure) => {
		const { gauzy } = page;
		const { renew } = await openSignedInPage();
		gauzy.breakRenewals(failure);

		for (let attempt = 0; attempt < 4; attempt += 1) {
			await renew();
		}

		expect(page.isSignedOut()).toBe(false);
		expect(mockToastError).not.toHaveBeenCalled();

		// And it goes through once it can be made again
		gauzy.breakRenewals(null);
		await renew();
		expect(gauzy.acceptsRefreshToken(getRefreshTokenCookie())).toBe(true);
	});

	it('ends the session, and says so, when the API refuses the refresh token', async () => {
		const { renew } = await openSignedInPage();
		page.gauzy.endSession();

		await renew();

		expect(mockToastError).toHaveBeenCalledWith('toasts.auth.SESSION_ENDED');
		expect(page.sentToSignIn).toHaveBeenCalledTimes(1);
		expect(getRefreshTokenCookie()).toBeFalsy();
		// The toast goes away with the page: the sign-in page is told too
		expect(storedSessionEndedNotice()).not.toBeNull();
	});
});

describe('a sign-out the person asked for', () => {
	it('leaves no note for the sign-in page: the person knows why they are on it', async () => {
		const { signOut } = await openSignedInPage();

		await signOut();

		expect(page.leftAfterSignOut).toHaveBeenCalledTimes(1);
		expect(getRefreshTokenCookie()).toBeFalsy();
		expect(storedSessionEndedNotice()).toBeNull();
	});
});
