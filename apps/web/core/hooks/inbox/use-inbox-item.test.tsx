/** @jest-environment jsdom */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { EInboxItemKind, EInboxItemSource, IInboxItem } from '@/core/types/interfaces/common/inbox-item';
import { queryKeys } from '@/core/query/keys';
import { useInboxItem } from './use-inbox-items';

const getItem = jest.fn<Promise<IInboxItem>, [string, AbortSignal | undefined]>();

jest.mock('@/core/services/client/api/inbox', () => ({
	inboxService: { getItem: (id: string, signal?: AbortSignal) => getItem(id, signal) }
}));

jest.mock('./use-inbox-scope', () => ({
	useInboxScope: () => ({ tenantId: 'tenant', organizationId: 'org', userId: 'user' })
}));

function item(title: string): IInboxItem {
	return {
		id: 'item-1',
		kind: EInboxItemKind.Notification,
		source: EInboxItemSource.Gauzy,
		status: 'OPEN',
		title,
		body: null,
		entity: 'Task',
		entityId: 't1',
		taskId: 't1',
		externalSource: 'gauzy-notification',
		externalId: 'n1',
		metadata: { notificationType: 'Assignment' },
		createdAt: '2026-11-11T08:00:00.000Z',
		recipient: { isRead: true }
	};
}

/** A read the case answers when it chooses. */
function pending() {
	let answer!: (value: IInboxItem) => void;
	const promise = new Promise<IInboxItem>((resolve) => (answer = resolve));
	return { promise, answer };
}

/** Every client a case made: a read one case left on its way must not answer into the next case's mock. */
const clients: QueryClient[] = [];

function setup(id: string | null = 'item-1') {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	clients.push(queryClient);
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	const hook = renderHook(({ heldId }) => useInboxItem(heldId), { wrapper, initialProps: { heldId: id } });
	return { queryClient, hook };
}

const titleOf = (hook: ReturnType<typeof setup>['hook']) => hook.result.current.data?.rawTitle;

/**
 * React Query tells the hook about a change on a later macrotask, so a check that a value stays as it is waits for
 * every update already scheduled to render first; otherwise it would pass before a late answer had a chance to land.
 */
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

/**
 * The detail pane keeps an entry after it left the list (an unread entry, read in the Unread tab). Kept as the copy
 * taken when it was opened, it never heard that another tab answered or closed a decision; read by hand on every list
 * change, an older read could land after a newer one, and an unchanged list never asked again. The item has its own
 * query under the inbox's key instead.
 */
describe('useInboxItem', () => {
	beforeEach(() => getItem.mockReset());
	afterEach(async () => {
		for (const client of clients.splice(0)) {
			await client.cancelQueries();
			client.clear();
		}
	});

	it('reads the held item, and again whenever the inbox is refetched', async () => {
		getItem.mockResolvedValueOnce(item('Before')).mockResolvedValueOnce(item('Closed in another tab'));
		const { queryClient, hook } = setup();

		await waitFor(() => expect(titleOf(hook)).toBe('Before'));

		// What a live inbox event does: the whole inbox is invalidated.
		await act(() => queryClient.invalidateQueries({ queryKey: queryKeys.inbox.all }));

		await waitFor(() => expect(titleOf(hook)).toBe('Closed in another tab'));
	});

	it('reads again after an action settles, and a read from before it cannot answer last', async () => {
		// The first read starts with the opening, while the action on the item is still on its way.
		const beforeTheAction = pending();
		getItem.mockReturnValueOnce(beforeTheAction.promise).mockResolvedValueOnce(item('After the action'));
		const { hook } = setup();
		await waitFor(() => expect(getItem).toHaveBeenCalledTimes(1));

		// The action settled: the page asks for a read from scratch.
		await act(() => hook.result.current.refresh());
		await waitFor(() => expect(titleOf(hook)).toBe('After the action'));

		// The read from before the action answers only now, with what the item was then.
		await act(async () => beforeTheAction.answer(item('Before the action')));
		await settle();
		expect(titleOf(hook)).toBe('After the action');
	});

	it('keeps a local change over a read that was already on its way', async () => {
		getItem.mockResolvedValueOnce(item('Before'));
		const { queryClient, hook } = setup();
		await waitFor(() => expect(titleOf(hook)).toBe('Before'));

		const onItsWay = pending();
		getItem.mockReturnValueOnce(onItsWay.promise);
		void queryClient.invalidateQueries({ queryKey: queryKeys.inbox.all });
		await waitFor(() => expect(getItem).toHaveBeenCalledTimes(2));

		await act(() => hook.result.current.patch(['item-1'], { rawTitle: 'Patched' }));
		await waitFor(() => expect(titleOf(hook)).toBe('Patched'));
		await act(async () => onItsWay.answer(item('Stale')));
		await settle();
		expect(titleOf(hook)).toBe('Patched');

		// A change to another item leaves this one alone.
		await act(() => hook.result.current.patch(['item-2'], { rawTitle: 'Other' }));
		await settle();
		expect(titleOf(hook)).toBe('Patched');
	});

	it('acts on the item held now, from callbacks made before it was held', async () => {
		getItem.mockResolvedValueOnce(item('Opened')).mockResolvedValueOnce(item('After the read update'));
		const { hook } = setup(null);
		const refreshFromBefore = hook.result.current.refresh;

		hook.rerender({ heldId: 'item-1' });
		await waitFor(() => expect(titleOf(hook)).toBe('Opened'));

		await act(() => refreshFromBefore());
		await waitFor(() => expect(titleOf(hook)).toBe('After the read update'));
	});

	it('reads nothing while the pane holds nothing out of the list', async () => {
		const { hook } = setup(null);
		await act(() => hook.result.current.refresh());
		await settle();
		expect(hook.result.current.data).toBeUndefined();
		expect(getItem).not.toHaveBeenCalled();
	});
});
