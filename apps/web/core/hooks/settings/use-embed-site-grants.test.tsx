/** @jest-environment jsdom */

import { focusManager, onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';

const mockListSiteGrants = jest.fn();
const mockEndSiteGrant = jest.fn();
let mockUser: { id: string; email: string } | undefined = { id: 'user-1', email: 'marie@example.com' };

jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: mockUser })
}));
jest.mock('@/core/services/client/api/embeds/embeds.service', () => ({
	embedsService: {
		listSiteGrants: (...args: unknown[]) => mockListSiteGrants(...args),
		endSiteGrant: (...args: unknown[]) => mockEndSiteGrant(...args)
	}
}));

import { useEmbedSiteGrants } from './use-embed-site-grants';

const PORTAL = { id: 'grant-1', origin: 'https://portal.example.com', expiresAt: '2026-12-01T09:00:00.000Z' };
const TEAM = { id: 'grant-2', origin: 'https://team.example.com', expiresAt: '2026-12-20T09:00:00.000Z' };

function failure(status: number) {
	return {
		message: `Request failed with status code ${status}`,
		code: 'ERR_BAD_REQUEST',
		status,
		response: { data: { message: 'refused' }, headers: {}, status, statusText: '' }
	};
}

function renderSiteGrants() {
	// The app's defaults (core/query/config) turn focus and reconnect refreshes off
	const client = new QueryClient({
		defaultOptions: {
			queries: { retry: 2, retryDelay: 1, refetchOnWindowFocus: false, refetchOnReconnect: false }
		}
	});
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	return { client, ...renderHook(() => useEmbedSiteGrants(), { wrapper }) };
}

describe('useEmbedSiteGrants', () => {
	beforeEach(() => {
		mockListSiteGrants.mockReset();
		mockEndSiteGrant.mockReset();
		mockUser = { id: 'user-1', email: 'marie@example.com' };
	});

	it('lists the sites, the one that can renew its sign-in the longest first', async () => {
		mockListSiteGrants.mockResolvedValue([PORTAL, TEAM]);

		const { result } = renderSiteGrants();

		expect(result.current.isLoading).toBe(true);
		await waitFor(() => expect(result.current.grants).toHaveLength(2));
		expect(result.current.grants.map((grant) => grant.id)).toEqual(['grant-2', 'grant-1']);
		expect(result.current.isLoading).toBe(false);
		expect(result.current.isError).toBe(false);
		expect(result.current.isUnavailable).toBe(false);
	});

	it('answers an empty list, loaded, for a person who allowed no site', async () => {
		mockListSiteGrants.mockResolvedValue([]);

		const { result } = renderSiteGrants();

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.grants).toEqual([]);
		expect(result.current.isUnavailable).toBe(false);
	});

	it('asks nothing before the user is known, and keeps waiting', () => {
		mockUser = undefined;

		const { result } = renderSiteGrants();

		expect(result.current.isLoading).toBe(true);
		expect(mockListSiteGrants).not.toHaveBeenCalled();
	});

	it('reads a 404 as a server without embeds, once, and shows no error', async () => {
		mockListSiteGrants.mockRejectedValue(failure(404));

		const { result } = renderSiteGrants();

		await waitFor(() => expect(result.current.isUnavailable).toBe(true));
		expect(result.current.isError).toBe(false);
		expect(mockListSiteGrants).toHaveBeenCalledTimes(1);
	});

	it('does not ask again after a 401, which the session renewal already answered', async () => {
		mockListSiteGrants.mockRejectedValue(failure(401));

		const { result } = renderSiteGrants();

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(mockListSiteGrants).toHaveBeenCalledTimes(1);
	});

	it('reports any other failure, after its retries, as an error the section can retry', async () => {
		mockListSiteGrants.mockRejectedValue(failure(500));
		const { result } = renderSiteGrants();
		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.isUnavailable).toBe(false);
		expect(mockListSiteGrants).toHaveBeenCalledTimes(3);
		mockListSiteGrants.mockResolvedValue([TEAM]);

		act(() => {
			result.current.retry();
		});

		await waitFor(() => expect(result.current.grants).toHaveLength(1));
		expect(result.current.isError).toBe(false);
	});

	it('reads the list again when the person comes back to the tab', async () => {
		mockListSiteGrants.mockResolvedValue([TEAM]);
		const { result } = renderSiteGrants();
		await waitFor(() => expect(result.current.grants).toHaveLength(1));
		expect(mockListSiteGrants).toHaveBeenCalledTimes(1);

		act(() => {
			focusManager.setFocused(false);
			focusManager.setFocused(true);
		});

		await waitFor(() => expect(mockListSiteGrants).toHaveBeenCalledTimes(2));
		focusManager.setFocused(undefined);
	});

	it('ends a site without waiting for the list to be read again', async () => {
		mockListSiteGrants.mockResolvedValue([PORTAL, TEAM]);
		mockEndSiteGrant.mockResolvedValue(undefined);
		const { result } = renderSiteGrants();
		await waitFor(() => expect(result.current.grants).toHaveLength(2));
		// The read that follows never answers, as on a connection lost right after the end request
		mockListSiteGrants.mockReturnValue(new Promise(() => undefined));

		await act(async () => {
			await result.current.endSite('grant-1');
		});

		expect(result.current.endingId).toBeNull();
	});

	it('sends the end request even when the browser reports no network, so a failure is told', async () => {
		mockListSiteGrants.mockResolvedValue([PORTAL, TEAM]);
		mockEndSiteGrant.mockRejectedValue(new Error('Network Error'));
		const { result } = renderSiteGrants();
		await waitFor(() => expect(result.current.grants).toHaveLength(2));
		onlineManager.setOnline(false);

		let refused: unknown = null;
		await act(async () => {
			await result.current.endSite('grant-1').catch((error: unknown) => {
				refused = error;
			});
		});
		onlineManager.setOnline(true);

		expect(mockEndSiteGrant).toHaveBeenCalledWith('grant-1');
		expect(refused).toBeInstanceOf(Error);
		expect(result.current.endingId).toBeNull();
	});

	it('marks the site whose sign-in is being ended, then reads the list again', async () => {
		mockListSiteGrants.mockResolvedValue([PORTAL, TEAM]);
		let finish: () => void = () => undefined;
		mockEndSiteGrant.mockReturnValue(
			new Promise<void>((resolve) => {
				finish = resolve;
			})
		);
		const { result } = renderSiteGrants();
		await waitFor(() => expect(result.current.grants).toHaveLength(2));

		let pending: Promise<void> = Promise.resolve();
		act(() => {
			pending = result.current.endSite('grant-1');
		});

		await waitFor(() => expect(result.current.endingId).toBe('grant-1'));
		mockListSiteGrants.mockResolvedValue([TEAM]);
		await act(async () => {
			finish();
			await pending;
		});
		expect(mockEndSiteGrant).toHaveBeenCalledWith('grant-1');
		await waitFor(() => expect(result.current.endingId).toBeNull());
		await waitFor(() => expect(result.current.grants.map((grant) => grant.id)).toEqual(['grant-2']));
	});

	it('hands a refused end to its caller, and still reads the list again', async () => {
		mockListSiteGrants.mockResolvedValue([TEAM]);
		mockEndSiteGrant.mockRejectedValue(failure(500));
		const { result } = renderSiteGrants();
		await waitFor(() => expect(result.current.grants).toHaveLength(1));

		let refusal: unknown = null;
		await act(async () => {
			try {
				await result.current.endSite('grant-2');
			} catch (error) {
				refusal = error;
			}
		});

		expect(refusal).toEqual(failure(500));
		expect(result.current.endingId).toBeNull();
		await waitFor(() => expect(mockListSiteGrants).toHaveBeenCalledTimes(2));
	});
});
