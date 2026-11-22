/** @jest-environment jsdom */
/**
 * #5694: once the signed-in user could not be read, the query asks again by itself, less and less often, until the API
 * answers; it never polls a user it already holds, and a reader that mounts meanwhile does not ask again.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { useUserQuery } from './user-user.query';

const mockGetUser = jest.fn();

jest.mock('@/core/services/client/api/users/user.service', () => ({
	userService: { getAuthenticatedUserData: () => mockGetUser() }
}));
jest.mock('@/core/lib/helpers/cookies', () => ({ getAccessTokenCookie: () => 'access-token' }));

const USER = { id: 'user-1', email: 'olu.adeyemi@example.com' };
const API_UNAVAILABLE = new ApiErrorService('Session check unavailable, retry later', 503);

function createClient() {
	return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderUserQuery(queryClient = createClient()) {
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return renderHook(() => useUserQuery(), { wrapper });
}

async function advance(ms: number) {
	await act(async () => {
		await jest.advanceTimersByTimeAsync(ms);
	});
}

describe('useUserQuery after a failed read', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		mockGetUser.mockReset();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('reads the user again 5 s after the read failed, and keeps it once the API answers', async () => {
		mockGetUser.mockRejectedValueOnce(API_UNAVAILABLE).mockResolvedValue(USER);

		const { result } = renderUserQuery();
		await advance(0);
		expect(result.current.isError).toBe(true);
		await advance(4_900);
		expect(mockGetUser).toHaveBeenCalledTimes(1);
		await advance(100);

		await waitFor(() => expect(result.current.data).toEqual(USER));
		expect(mockGetUser).toHaveBeenCalledTimes(2);
	});

	it('asks less and less often while the API stays down', async () => {
		mockGetUser.mockRejectedValue(API_UNAVAILABLE);

		renderUserQuery();
		await advance(0);
		const callsAfter = async (ms: number) => {
			await advance(ms);
			return mockGetUser.mock.calls.length;
		};

		expect(await callsAfter(5_000)).toBe(2);
		expect(await callsAfter(10_000)).toBe(3);
		expect(await callsAfter(20_000)).toBe(4);
		expect(await callsAfter(40_000)).toBe(5);
		expect(await callsAfter(60_000)).toBe(6);
		expect(await callsAfter(59_000)).toBe(6);
		expect(await callsAfter(1_000)).toBe(7);
	});

	it('does not read again by itself after a refusal that would answer the same', async () => {
		mockGetUser.mockRejectedValue(new ApiErrorService('Forbidden', 403));

		renderUserQuery();
		await advance(0);
		await advance(120_000);

		expect(mockGetUser).toHaveBeenCalledTimes(1);
	});

	it('does not read again when another part of the page mounts after the failure', async () => {
		mockGetUser.mockRejectedValue(API_UNAVAILABLE);
		const queryClient = createClient();

		renderUserQuery(queryClient);
		await advance(0);
		renderUserQuery(queryClient);
		renderUserQuery(queryClient);
		await advance(1_000);

		expect(mockGetUser).toHaveBeenCalledTimes(1);
	});

	it('does not poll a user it already holds', async () => {
		mockGetUser.mockResolvedValue(USER);

		const { result } = renderUserQuery();
		await advance(0);
		await waitFor(() => expect(result.current.data).toEqual(USER));
		await advance(10 * 60_000);

		expect(mockGetUser).toHaveBeenCalledTimes(1);
	});
});
