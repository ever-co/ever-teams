/** @jest-environment jsdom */

import { act, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { reownActiveQueriesAfterTokenRefresh } from './token-refresh-query-ownership';

describe('reownActiveQueriesAfterTokenRefresh', () => {
	it('aborts an in-flight old-token query before starting it with the refreshed token', async () => {
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } }
		});
		const queryKey = ['critical', 'scope-a'] as const;
		const calls: string[] = [];
		const signals: AbortSignal[] = [];

		function Harness({ token }: { token: string }) {
			useQuery({
				queryKey,
				queryFn: ({ signal }) => {
					calls.push(token);
					signals.push(signal);
					if (token === 'token-b') return Promise.resolve(token);
					return new Promise<string>(() => undefined);
				}
			});
			return null;
		}

		const view = render(
			<QueryClientProvider client={queryClient}>
				<Harness token="token-a" />
			</QueryClientProvider>
		);
		await waitFor(() => expect(calls).toEqual(['token-a']));

		view.rerender(
			<QueryClientProvider client={queryClient}>
				<Harness token="token-b" />
			</QueryClientProvider>
		);
		await act(async () => {
			await reownActiveQueriesAfterTokenRefresh(queryClient, [queryKey], () => true);
		});

		expect(signals[0].aborted).toBe(true);
		expect(calls).toEqual(['token-a', 'token-b']);
		queryClient.clear();
	});
});
