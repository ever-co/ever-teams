/**
 * @jest-environment jsdom
 *
 * Account deletion by e-mail link, browser side:
 * - clearSessionIfAccountGone clears a session only on a conclusive answer about the very token in the cookie;
 * - the confirm page drops the result of a confirmation when another link took over the tab meanwhile.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
// jest.mock calls below are hoisted above this import
import { clearSessionIfAccountGone, useAccountDeletionConfirm } from './use-account-deletion';

// next-intl ships ESM only; the confirm hook does not use it (the request hook's useLocale does)
jest.mock('next-intl', () => ({ useLocale: () => 'en' }));

let mockCookieToken: string | null = null;
const mockRemoveAuthCookies = jest.fn();
jest.mock('@/core/lib/helpers/cookies', () => ({
	getAccessTokenCookie: () => mockCookieToken,
	removeAuthCookies: () => mockRemoveAuthCookies()
}));

const mockVerify = jest.fn();
const mockConfirm = jest.fn();
jest.mock('@/core/services/client/api/auth/account-deletion.service', () => ({
	accountDeletionService: {
		verify: (...args: unknown[]) => mockVerify(...args),
		confirm: (...args: unknown[]) => mockConfirm(...args)
	},
	isAccountDeletionLinkGone: () => false,
	isAccountDeletionPlanChanged: () => false
}));


/** An unsigned JWT whose `exp` is `secondsFromNow` away (only decoded locally, never verified here). */
function jwt(secondsFromNow: number): string {
	const now = Math.floor(Date.now() / 1000);
	const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
	return `${part({ alg: 'none', typ: 'JWT' })}.${part({ iat: now, exp: now + secondsFromNow })}.sig`;
}

/** A fetch whose answer the test releases, and which runs `during` while it is pending. */
function pendingFetch(status: number, during: () => void = () => undefined) {
	let release: () => void = () => undefined;
	const fetchMock = jest.fn(
		() =>
			new Promise<Response>((resolve) => {
				during();
				release = () => resolve({ status } as Response); // the code reads the status only
			})
	);
	global.fetch = fetchMock as unknown as typeof fetch;
	return { fetchMock, release: () => release() };
}

const queryClient = () => ({ clear: jest.fn() });

beforeEach(() => {
	mockCookieToken = null;
	mockRemoveAuthCookies.mockReset();
	mockVerify.mockReset();
	mockConfirm.mockReset();
});

describe('clearSessionIfAccountGone', () => {
	it('clears a session whose valid token the API refuses', async () => {
		mockCookieToken = jwt(600);
		const { release } = pendingFetch(401);
		const client = queryClient();

		const cleared = clearSessionIfAccountGone(client);
		release();

		await expect(cleared).resolves.toBe(true);
		expect(mockRemoveAuthCookies).toHaveBeenCalledTimes(1);
		expect(client.clear).toHaveBeenCalledTimes(1);
	});

	it('keeps the session when another tab replaced the cookie while /user/me was pending', async () => {
		mockCookieToken = jwt(600);
		const { release } = pendingFetch(401, () => {
			mockCookieToken = jwt(900); // a sign-in or a refresh in another tab
		});

		const cleared = clearSessionIfAccountGone(queryClient());
		release();

		await expect(cleared).resolves.toBe(false);
		expect(mockRemoveAuthCookies).not.toHaveBeenCalled();
	});

	it('keeps the session when its token expired while /user/me was pending', async () => {
		const token = jwt(600);
		mockCookieToken = token;
		const realNow = Date.now;
		const { release } = pendingFetch(401, () => {
			Date.now = () => realNow() + 601_000; // the token's exp passes during the call
		});

		try {
			const cleared = clearSessionIfAccountGone(queryClient());
			release();
			await expect(cleared).resolves.toBe(false);
		} finally {
			Date.now = realNow;
		}
		expect(mockRemoveAuthCookies).not.toHaveBeenCalled();
	});

	it('does not even ask about an expired token, nor clear a session the API accepts', async () => {
		mockCookieToken = jwt(-10);
		const { fetchMock } = pendingFetch(401);
		await expect(clearSessionIfAccountGone(queryClient())).resolves.toBe(false);
		expect(fetchMock).not.toHaveBeenCalled();

		mockCookieToken = jwt(600);
		const accepted = pendingFetch(200);
		const cleared = clearSessionIfAccountGone(queryClient());
		accepted.release();
		await expect(cleared).resolves.toBe(false);
		expect(mockRemoveAuthCookies).not.toHaveBeenCalled();
	});
});

describe('useAccountDeletionConfirm', () => {
	const preview = (planHash: string) => ({
		email: 'j***@example.test',
		expiresAt: new Date(Date.now() + 600_000).toISOString(),
		planHash,
		accounts: [{ workspace: planHash, outcome: 'workspace-deleted' as const }]
	});

	function wrapper({ children }: { children: ReactNode }) {
		return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
	}

	it('shows the new link’s preview, not "deleted", when another link opens during the session check', async () => {
		window.history.replaceState(null, '', '/delete-account/confirm#token=first');
		mockVerify.mockImplementation(async (token: string) => preview(`plan-${token}`));
		mockConfirm.mockResolvedValue({ deleted: true, accounts: 1, workspacesDeleted: 1 });
		mockCookieToken = jwt(600); // a session is open: confirm checks it after deleting

		const { result } = renderHook(() => useAccountDeletionConfirm(), { wrapper });
		await waitFor(() => expect(result.current.phase).toBe('ready'));
		expect(result.current.details?.planHash).toBe('plan-first');

		// The second link is pasted into the tab while /user/me (the session check) is pending
		const { release } = pendingFetch(200, () => {
			window.history.replaceState(null, '', '/delete-account/confirm#token=second');
			window.dispatchEvent(new HashChangeEvent('hashchange'));
		});

		let confirming: Promise<void> = Promise.resolve();
		act(() => {
			confirming = result.current.confirm();
		});
		await waitFor(() => expect(mockVerify).toHaveBeenCalledWith('second'));
		await act(async () => {
			release();
			await confirming;
		});

		await waitFor(() => expect(result.current.details?.planHash).toBe('plan-second'));
		expect(mockConfirm).toHaveBeenCalledWith('first', 'plan-first');
		expect(result.current.phase).toBe('ready');
		expect(result.current.result).toBeNull();
		expect(window.location.hash).toBe('');
	});
});
