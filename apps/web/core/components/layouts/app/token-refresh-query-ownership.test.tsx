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

	it('discovers an active credential-scoped query without putting the token in its key', async () => {
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } }
		});
		const queryKey = ['roles', 'scope', 'tenant-1'] as const;
		const calls: string[] = [];
		const signals: AbortSignal[] = [];

		function Harness({ token }: { token: string }) {
			useQuery({
				queryKey,
				meta: { fastCredentialScoped: true },
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
			await reownActiveQueriesAfterTokenRefresh(queryClient, [], () => true);
		});

		expect(signals[0].aborted).toBe(true);
		expect(calls).toEqual(['token-a', 'token-b']);
		expect(queryKey).toEqual(['roles', 'scope', 'tenant-1']);
		queryClient.clear();
	});

	it('cancels a credential-scoped imperative fetch without restarting inactive work', async () => {
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const queryKey = ['daily-plans', 'task', 'tenant-1', 'task-1'] as const;
		const signals: AbortSignal[] = [];
		let calls = 0;
		const request = queryClient
			.fetchQuery({
				queryKey,
				meta: { fastCredentialScoped: true },
				queryFn: ({ signal }) => {
					calls += 1;
					signals.push(signal);
					return new Promise<string>(() => undefined);
				}
			})
			.catch(() => undefined);

		await reownActiveQueriesAfterTokenRefresh(queryClient, [], () => true);
		const abortedByReownership = signals[0].aborted;
		queryClient.clear();
		await request;

		expect(abortedByReownership).toBe(true);
		expect(calls).toBe(1);
	});

	it('does not cancel unrelated queries while discovering credential-owned work', async () => {
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const signalPromise = new Promise<AbortSignal>((resolve) => {
			void queryClient
				.fetchQuery({
					queryKey: ['legacy', 'unowned'],
					queryFn: ({ signal }) => {
						resolve(signal);
						return new Promise<string>(() => undefined);
					}
				})
				.catch(() => undefined);
		});
		const signal = await signalPromise;

		await reownActiveQueriesAfterTokenRefresh(queryClient, [], () => true);

		expect(signal.aborted).toBe(false);
		queryClient.clear();
	});
});
