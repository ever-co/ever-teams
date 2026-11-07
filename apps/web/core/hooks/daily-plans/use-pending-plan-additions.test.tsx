/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, createStore } from 'jotai';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { queryKeys } from '@/core/query/keys';
import { pendingPlanAdditionsState } from '@/core/stores/daily-plan/pending-plan-additions';
import { createdPlanIdOf, useTrackPlanAddition } from './use-pending-plan-additions';

/**
 * A task on its way into a plan the request also creates: until the plans read after the request land, the addition
 * is matched to the plan by day and owner. `POST /daily-plan` answers the created plan with its id, so once the
 * request has answered the addition carries that id and matches the plan by it.
 */
describe('useTrackPlanAddition', () => {
	function build() {
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const store = createStore();
		const wrapper = ({ children }: PropsWithChildren) => (
			<Provider store={store}>
				<QueryClientProvider client={client}>{children}</QueryClientProvider>
			</Provider>
		);
		const { result } = renderHook(() => useTrackPlanAddition(), { wrapper });
		return { client, store, track: result.current };
	}

	/** A plans read that stays in flight until the test ends it, so the addition is observable while it waits. */
	function startPlansRead(client: QueryClient) {
		let finish: (plans: unknown[]) => void = () => undefined;
		const promise = client.fetchQuery({
			queryKey: [...queryKeys.dailyPlans.all, 'test-in-flight'],
			queryFn: () => new Promise<unknown[]>((resolve) => (finish = resolve))
		});
		return { finish: () => finish([]), promise };
	}

	it('carries the answered plan id once a creating request has answered', async () => {
		const { client, store, track } = build();
		const read = startPlansRead(client);
		const target = { taskId: 'task-1', day: '2026-11-07', employeeId: 'employee-1' };

		let tracked: Promise<unknown> = Promise.resolve();
		await act(async () => {
			tracked = track(target, async () => ({ id: 'plan-new', date: '2026-11-07', employeeId: 'employee-1' }));
			// the request answers on the next tick; the plans read keeps the addition alive
			await Promise.resolve();
			await Promise.resolve();
		});

		const [addition] = store.get(pendingPlanAdditionsState);
		expect(addition).toMatchObject({ taskId: 'task-1', day: '2026-11-07', employeeId: 'employee-1', planId: 'plan-new' });

		await act(async () => {
			read.finish();
			await read.promise;
			await tracked;
		});
		expect(store.get(pendingPlanAdditionsState)).toEqual([]);
	});

	it('keeps the plan id it was given when the request adds to an existing plan', async () => {
		const { client, store, track } = build();
		const read = startPlansRead(client);

		let tracked: Promise<unknown> = Promise.resolve();
		await act(async () => {
			tracked = track({ taskId: 'task-2', planId: 'plan-existing', day: '2026-11-08' }, async () => ({ id: 'plan-other' }));
			await Promise.resolve();
			await Promise.resolve();
		});
		expect(store.get(pendingPlanAdditionsState)[0]).toMatchObject({ taskId: 'task-2', planId: 'plan-existing' });

		await act(async () => {
			read.finish();
			await read.promise;
			await tracked;
		});
		expect(store.get(pendingPlanAdditionsState)).toEqual([]);
	});

	it('reads an id only from an answer that carries one', () => {
		expect(createdPlanIdOf({ id: 'plan-1' })).toBe('plan-1');
		expect(createdPlanIdOf({ id: '' })).toBeNull();
		expect(createdPlanIdOf({ id: 42 })).toBeNull();
		expect(createdPlanIdOf(undefined)).toBeNull();
		expect(createdPlanIdOf(null)).toBeNull();
		expect(createdPlanIdOf('plan-1')).toBeNull();
	});
});
