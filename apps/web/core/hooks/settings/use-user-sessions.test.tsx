/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';

const mockList = jest.fn();
const mockSignOutOthers = jest.fn();
const mockSignOut = jest.fn();
const mockSignInEmail = jest.fn();
let mockUser: { id: string; email: string } | undefined = { id: 'user-1', email: 'marie@example.com' };

jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: mockUser })
}));
jest.mock('@/core/services/client/api/auth/user-session.service', () => ({
	userSessionService: {
		list: (...args: unknown[]) => mockList(...args),
		signOutOthers: (...args: unknown[]) => mockSignOutOthers(...args),
		signOut: (...args: unknown[]) => mockSignOut(...args)
	}
}));
jest.mock('@/core/services/client/api/auth/auth.service', () => ({
	authService: { signInEmail: (...args: unknown[]) => mockSignInEmail(...args) }
}));

import { useUserSessions } from './use-user-sessions';

const THIS_DEVICE = {
	id: 'session-1',
	current: true,
	app: 'WEB',
	browser: 'Chrome 131',
	os: 'Windows',
	userAgent: null,
	ipAddress: null,
	signedInAt: '2026-11-10T08:00:00.000Z',
	lastActiveAt: '2026-11-14T09:00:00.000Z'
};
const LAPTOP = { ...THIS_DEVICE, id: 'session-2', current: false, browser: 'Firefox 133', os: 'Linux' };

function failure(status: number, code?: string) {
	return {
		message: `Request failed with status code ${status}`,
		code: 'ERR_BAD_REQUEST',
		status,
		response: { data: { code, message: 'refused' }, headers: {}, status, statusText: '' }
	};
}

function renderSessions() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: 2, retryDelay: 1 } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	return { client, ...renderHook(() => useUserSessions(), { wrapper }) };
}

describe('useUserSessions', () => {
	beforeEach(() => {
		mockList.mockReset();
		mockSignOutOthers.mockReset();
		mockSignOut.mockReset();
		mockSignInEmail.mockReset();
		mockUser = { id: 'user-1', email: 'marie@example.com' };
	});

	it('lists the sessions with this device first', async () => {
		mockList.mockResolvedValue([LAPTOP, THIS_DEVICE]);

		const { result } = renderSessions();

		await waitFor(() => expect(result.current.sessions).toHaveLength(2));
		expect(result.current.sessions.map((session) => session.id)).toEqual(['session-1', 'session-2']);
		expect(result.current.isLoading).toBe(false);
		expect(result.current.isError).toBe(false);
	});

	it('is loading until the first answer, and asks nothing before the user is known', async () => {
		mockUser = undefined;

		const { result } = renderSessions();

		expect(result.current.isLoading).toBe(false);
		expect(mockList).not.toHaveBeenCalled();
	});

	it('reads a 404 as an API without sessions, once, and shows no error', async () => {
		mockList.mockRejectedValue(failure(404));

		const { result } = renderSessions();

		await waitFor(() => expect(result.current.isUnavailable).toBe(true));
		expect(result.current.isError).toBe(false);
		expect(mockList).toHaveBeenCalledTimes(1);
	});

	it("is not asked again when the profile's user data is refreshed, as a saved field does", async () => {
		mockList.mockRejectedValue(failure(404));
		const { client, result } = renderSessions();
		await waitFor(() => expect(result.current.isUnavailable).toBe(true));

		await act(async () => {
			await client.invalidateQueries({ queryKey: ['users'] });
		});

		expect(mockList).toHaveBeenCalledTimes(1);
	});

	it('reports any other failure as an error the section can retry', async () => {
		mockList.mockRejectedValue(failure(500));

		const { result } = renderSessions();

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.isUnavailable).toBe(false);
	});

	it('signs the other sessions out with the proof given, answers how many went and reads the list again', async () => {
		mockList.mockResolvedValue([THIS_DEVICE, LAPTOP]);
		mockSignOutOthers.mockResolvedValue({ signedOut: 1 });
		const { result } = renderSessions();
		await waitFor(() => expect(result.current.sessions).toHaveLength(2));

		let signedOut = -1;
		await act(async () => {
			signedOut = await result.current.signOutOthers({ password: 'secret-1' });
		});

		expect(mockSignOutOthers).toHaveBeenCalledWith({ password: 'secret-1' });
		expect(signedOut).toBe(1);
		await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
	});

	it('marks the session being signed out, then reads the list again', async () => {
		mockList.mockResolvedValue([THIS_DEVICE, LAPTOP]);
		let finish: () => void = () => undefined;
		mockSignOut.mockReturnValue(
			new Promise<void>((resolve) => {
				finish = resolve;
			})
		);
		const { result } = renderSessions();
		await waitFor(() => expect(result.current.sessions).toHaveLength(2));

		let pending: Promise<void> = Promise.resolve();
		act(() => {
			pending = result.current.signOut('session-2');
		});

		await waitFor(() => expect(result.current.signingOutId).toBe('session-2'));
		await act(async () => {
			finish();
			await pending;
		});
		expect(mockSignOut).toHaveBeenCalledWith('session-2');
		await waitFor(() => expect(result.current.signingOutId).toBeNull());
		await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
	});

	it("sends the sign-in code e-mail to the user's own address", async () => {
		mockList.mockResolvedValue([THIS_DEVICE]);
		mockSignInEmail.mockResolvedValue({ data: { status: 200, message: 'sent' } });
		const { result } = renderSessions();

		await act(async () => {
			await result.current.sendCode();
		});

		expect(mockSignInEmail).toHaveBeenCalledWith('marie@example.com');
		expect(result.current.email).toBe('marie@example.com');
	});
});
