/**
 * @jest-environment jsdom
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { IChatMessage, IChatMessagePage, IChatMessagesQuery } from '@/core/types/interfaces/common/chat';

const mockMessages = jest.fn();

jest.mock('@/core/services/client/api/chat', () => ({
	chatService: { messages: (conversationId: string, query?: IChatMessagesQuery) => mockMessages(conversationId, query) }
}));

jest.mock('./use-chat-scope', () => ({
	useChatScope: () => ({ tenantId: 'ten', organizationId: 'org', userId: 'usr', employeeId: 'emp' })
}));

import { queryKeys } from '@/core/query/keys';
import { realtimeBus } from '@/core/lib/realtime/bus';
import { refreshHeldMessage, refreshHeldWindow, useChatMessages, type ChatMessagesCache } from './use-chat-messages';

function message(id: string, minute: number, body: string, extra: Partial<IChatMessage> = {}): IChatMessage {
	return {
		id,
		conversationId: 'c1',
		kind: 'text',
		body,
		mentionsChannel: false,
		mentionsHere: false,
		alsoInConversation: false,
		replyCount: 0,
		createdAt: `2026-01-01T00:0${minute}:00.000Z`,
		...extra
	};
}

const page = (messages: IChatMessage[], hasBefore = false): IChatMessagePage => ({ messages, hasBefore, hasAfter: false });

describe('refreshHeldWindow (no live channel)', () => {
	const key = queryKeys.chat.messages('ten', 'c1');

	it('reads the held messages again from the oldest forward and shows their edits and deletions', async () => {
		const client = new QueryClient();
		client.setQueryData<ChatMessagesCache>(key, {
			messages: [message('m1', 1, 'one'), message('m2', 2, 'two'), message('m3', 3, 'three'), message('pending:1', 4, 'sending')],
			hasBefore: true,
			hasAfter: false,
			serverNewestId: 'm3'
		});
		mockMessages.mockReset();
		mockMessages
			// Around the oldest held: one older message (not held) and two held ones.
			.mockResolvedValueOnce({ messages: [message('m0', 0, 'older'), message('m1', 1, 'one, edited', { editedAt: '2026-01-01T00:08:00.000Z' }), message('m2', 2, 'two')], hasBefore: true, hasAfter: true })
			// Forward: the last held one, deleted, then a newer one (not held: the forward read's).
			.mockResolvedValueOnce({ messages: [message('m3', 3, '', { deletedAt: '2026-01-01T00:09:00.000Z' }), message('m4', 5, 'newer')], hasBefore: true, hasAfter: false });

		await expect(refreshHeldWindow(client, key, 'c1')).resolves.toEqual({ replaced: 3, next: null });

		expect(mockMessages.mock.calls).toEqual([
			['c1', { around: 'm1' }],
			['c1', { after: 'm2' }]
		]);
		const held = client.getQueryData<ChatMessagesCache>(key);
		expect(held?.messages.map((m) => [m.id, m.body, m.deletedAt ?? null])).toEqual([
			['m1', 'one, edited', null],
			['m2', 'two', null],
			['m3', '', '2026-01-01T00:09:00.000Z'],
			['pending:1', 'sending', null]
		]);
		expect(held?.serverNewestId).toBe('m3');
	});

	it('stops at the first page that reaches past the newest held message', async () => {
		const client = new QueryClient();
		client.setQueryData<ChatMessagesCache>(key, { messages: [message('m1', 1, 'one')], hasBefore: false, hasAfter: false, serverNewestId: 'm1' });
		mockMessages.mockReset();
		mockMessages.mockResolvedValueOnce({ messages: [message('m1', 1, 'one'), message('m2', 2, 'not held')], hasBefore: false, hasAfter: true });

		await expect(refreshHeldWindow(client, key, 'c1')).resolves.toEqual({ replaced: 1, next: null });
		expect(mockMessages).toHaveBeenCalledTimes(1);
		expect(client.getQueryData<ChatMessagesCache>(key)?.messages.map((m) => m.id)).toEqual(['m1']);
	});
});

describe('refreshHeldWindow over a long timeline', () => {
	const key = queryKeys.chat.messages('ten', 'c1');

	it('goes on where the budget stopped it, and starts from the oldest again once it reached the newest held message', async () => {
		const client = new QueryClient();
		// 12 held messages, one per page: the 10-page budget stops at m10.
		const held = Array.from({ length: 12 }, (_, index) => message(`m${index + 1}`, 0, `body ${index + 1}`, { createdAt: `2026-01-01T00:${String(index + 10)}:00.000Z` }));
		client.setQueryData<ChatMessagesCache>(key, { messages: held, hasBefore: false, hasAfter: false, serverNewestId: 'm12' });
		const pageOf = (index: number) => ({ messages: [held[index]], hasBefore: index > 0, hasAfter: index < 11 });
		mockMessages.mockReset();
		mockMessages.mockImplementation(async (_conversationId: string, query?: IChatMessagesQuery) => {
			// After a message past the held window (a jump replaced the timeline): newer messages only.
			if (query?.after === 'past') return { messages: [message('n1', 0, 'newer', { createdAt: '2026-01-01T00:59:00.000Z' })], hasBefore: true, hasAfter: false };
			const at = query?.around ?? query?.after;
			const index = held.findIndex((m) => m.id === at);
			return pageOf(query?.around ? index : index + 1);
		});

		const first = await refreshHeldWindow(client, key, 'c1');
		expect(first).toEqual({ replaced: 10, next: 'm10' });

		const second = await refreshHeldWindow(client, key, 'c1', first.next);
		expect(second).toEqual({ replaced: 2, next: null });
		expect(mockMessages.mock.calls.slice(10).map((call) => call[1])).toEqual([{ after: 'm10' }, { after: 'm11' }]);

		// A cursor past the held window (a jump replaced the timeline) ends at its first page; the next starts from the oldest.
		mockMessages.mockClear();
		await expect(refreshHeldWindow(client, key, 'c1', 'past')).resolves.toEqual({ replaced: 0, next: null });
		expect(mockMessages).toHaveBeenCalledTimes(1);
	});
});

describe('refreshHeldWindow over a gap in the held timeline', () => {
	const key = queryKeys.chat.messages('ten', 'c1');

	it('reads on past a page that ends inside a gap, up to the newest held message', async () => {
		const client = new QueryClient();
		client.setQueryData<ChatMessagesCache>(key, { messages: [message('m1', 1, 'one'), message('m3', 3, 'three')], hasBefore: false, hasAfter: false, serverNewestId: 'm3' });
		mockMessages.mockReset();
		mockMessages
			.mockResolvedValueOnce({ messages: [message('m1', 1, 'one'), message('m2', 2, 'not held')], hasBefore: false, hasAfter: true })
			.mockResolvedValueOnce({ messages: [message('m3', 3, 'three, edited', { editedAt: '2026-01-01T00:08:00.000Z' })], hasBefore: true, hasAfter: false });

		await expect(refreshHeldWindow(client, key, 'c1')).resolves.toEqual({ replaced: 2, next: null });
		expect(mockMessages.mock.calls.map((call) => call[1])).toEqual([{ around: 'm1' }, { after: 'm2' }]);
		expect(client.getQueryData<ChatMessagesCache>(key)?.messages.map((m) => [m.id, m.body])).toEqual([
			['m1', 'one'],
			['m3', 'three, edited']
		]);
	});
});

describe('refreshHeldWindow over messages stamped the same time', () => {
	const key = queryKeys.chat.messages('ten', 'c1');

	it('reads on past a page that ends on a message stamped like the newest held one, up to that message itself', async () => {
		const client = new QueryClient();
		const same = { createdAt: '2026-01-01T00:05:00.000Z' };
		client.setQueryData<ChatMessagesCache>(key, {
			messages: [message('m1', 1, 'one'), message('m2', 5, 'two', same), message('m3', 5, 'three', same)],
			hasBefore: false,
			hasAfter: false,
			serverNewestId: 'm3'
		});
		mockMessages.mockReset();
		mockMessages
			.mockResolvedValueOnce({ messages: [message('m1', 1, 'one'), message('m2', 5, 'two', same)], hasBefore: false, hasAfter: true })
			.mockResolvedValueOnce({ messages: [message('m3', 5, '', { ...same, deletedAt: '2026-01-01T00:09:00.000Z' })], hasBefore: true, hasAfter: true });

		await expect(refreshHeldWindow(client, key, 'c1')).resolves.toEqual({ replaced: 3, next: null });
		// Stopped at the newest held message itself: no read past it.
		expect(mockMessages).toHaveBeenCalledTimes(2);
		expect(client.getQueryData<ChatMessagesCache>(key)?.messages.find((m) => m.id === 'm3')?.deletedAt).toBe('2026-01-01T00:09:00.000Z');
	});
});

describe('refreshHeldWindow over a gap longer than its budget', () => {
	const key = queryKeys.chat.messages('ten', 'c1');

	it('goes on after the last message read, held or not, instead of reading the gap again', async () => {
		const client = new QueryClient();
		const at = (index: number) => `2026-01-01T01:${String(index).padStart(2, '0')}:00.000Z`;
		// m1 and m15 held; u2..u14 between them are not (a gap the forward read left): one message per page.
		const all = Array.from({ length: 15 }, (_, index) =>
			message(index === 0 ? 'm1' : index === 14 ? 'm15' : `u${index + 1}`, 0, `body ${index + 1}`, { createdAt: at(index + 1) })
		);
		client.setQueryData<ChatMessagesCache>(key, { messages: [all[0], all[14]], hasBefore: false, hasAfter: false, serverNewestId: 'm15' });
		mockMessages.mockReset();
		mockMessages.mockImplementation(async (_conversationId: string, query?: IChatMessagesQuery) => {
			const index = all.findIndex((m) => m.id === (query?.around ?? query?.after));
			const shown = query?.around ? index : index + 1;
			return { messages: [all[shown]], hasBefore: shown > 0, hasAfter: shown < all.length - 1 };
		});

		const first = await refreshHeldWindow(client, key, 'c1');
		expect(first).toEqual({ replaced: 1, next: 'u10' });
		const second = await refreshHeldWindow(client, key, 'c1', first.next);
		expect(second).toEqual({ replaced: 1, next: null });
		expect(mockMessages.mock.calls.slice(10).map((call) => call[1])).toEqual([
			{ after: 'u10' },
			{ after: 'u11' },
			{ after: 'u12' },
			{ after: 'u13' },
			{ after: 'u14' }
		]);
	});
});

describe('refreshHeldMessage', () => {
	const key = queryKeys.chat.messages('ten', 'c1');

	it('puts the platform copy of an older held message in its place', async () => {
		const client = new QueryClient();
		client.setQueryData<ChatMessagesCache>(key, {
			messages: [message('m1', 1, 'before'), message('m2', 2, 'two')],
			hasBefore: false,
			hasAfter: false,
			serverNewestId: 'm2'
		});
		mockMessages.mockResolvedValueOnce(page([message('m1', 1, '', { deletedAt: '2026-01-01T00:09:00.000Z' }), message('m2', 2, 'two')]));

		await expect(refreshHeldMessage(client, key, 'c1', 'm1')).resolves.toBe(true);

		expect(mockMessages).toHaveBeenCalledWith('c1', { around: 'm1' });
		const held = client.getQueryData<ChatMessagesCache>(key);
		expect(held?.messages.map((m) => [m.id, m.body, m.deletedAt ?? null])).toEqual([
			['m1', '', '2026-01-01T00:09:00.000Z'],
			['m2', 'two', null]
		]);
		expect(held?.serverNewestId).toBe('m2');
	});

	it('keeps the answer of the read started last when two reads of one message finish out of order', async () => {
		const client = new QueryClient();
		client.setQueryData<ChatMessagesCache>(key, { messages: [message('m1', 1, 'before')], hasBefore: false, hasAfter: false, serverNewestId: 'm1' });
		let answerEdit!: (value: IChatMessagePage) => void;
		let answerDeletion!: (value: IChatMessagePage) => void;
		mockMessages
			.mockReturnValueOnce(new Promise<IChatMessagePage>((resolve) => (answerEdit = resolve)))
			.mockReturnValueOnce(new Promise<IChatMessagePage>((resolve) => (answerDeletion = resolve)));

		const afterEdit = refreshHeldMessage(client, key, 'c1', 'm1');
		const afterDeletion = refreshHeldMessage(client, key, 'c1', 'm1');
		answerDeletion(page([message('m1', 1, '', { deletedAt: '2026-01-01T00:09:00.000Z' })]));
		await expect(afterDeletion).resolves.toBe(true);
		answerEdit(page([message('m1', 1, 'edited', { editedAt: '2026-01-01T00:08:00.000Z' })]));
		await expect(afterEdit).resolves.toBe(false);

		const held = client.getQueryData<ChatMessagesCache>(key);
		expect(held?.messages.map((m) => [m.body, m.deletedAt ?? null])).toEqual([['', '2026-01-01T00:09:00.000Z']]);
	});

	it('reads nothing for a message the timeline does not hold', async () => {
		const client = new QueryClient();
		client.setQueryData<ChatMessagesCache>(key, { messages: [message('m2', 2, 'two')], hasBefore: true, hasAfter: false, serverNewestId: 'm2' });

		await expect(refreshHeldMessage(client, key, 'c1', 'm1')).resolves.toBe(false);
		expect(mockMessages).not.toHaveBeenCalled();
	});
});

describe('useChatMessages, a live edit of an older message', () => {
	it('shows the edit of a message loaded further up the timeline', async () => {
		mockMessages.mockImplementation(async (_conversationId: string, query: IChatMessagesQuery = {}): Promise<IChatMessagePage> => {
			if (query.before) return page([message('m1', 1, 'first'), message('m2', 2, 'second')]);
			if (query.around === 'm1') return page([message('m1', 1, 'first, edited', { editedAt: '2026-01-01T00:09:00.000Z' }), message('m2', 2, 'second')], false);
			return page([message('m3', 3, 'third'), message('m4', 4, 'fourth')], true);
		});
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

		const { result, unmount } = renderHook(() => useChatMessages('c1', true), { wrapper });
		await waitFor(() => expect(result.current.messages.map((m) => m.id)).toEqual(['m3', 'm4']));
		await act(async () => {
			await result.current.loadOlder();
		});
		expect(result.current.messages.map((m) => m.id)).toEqual(['m1', 'm2', 'm3', 'm4']);

		act(() => {
			realtimeBus.emit({
				eventId: 'e1',
				eventName: 'chat_message.updated',
				occurredAt: '2026-01-01T00:09:00.000Z',
				aggregate: { type: 'ChatMessage', id: 'm1' },
				sequence: null,
				data: { conversationId: 'c1', messageId: 'm1' }
			});
		});

		await waitFor(() => expect(result.current.messages[0].body).toBe('first, edited'));
		expect(result.current.messages.map((m) => m.id)).toEqual(['m1', 'm2', 'm3', 'm4']);

		// An event of another conversation reads nothing.
		mockMessages.mockClear();
		act(() => {
			realtimeBus.emit({
				eventId: 'e2',
				eventName: 'chat_message.deleted',
				occurredAt: '2026-01-01T00:10:00.000Z',
				aggregate: { type: 'ChatMessage', id: 'm1' },
				sequence: null,
				data: { conversationId: 'c2', messageId: 'm1' }
			});
		});
		await act(async () => {});
		expect(mockMessages).not.toHaveBeenCalled();
		unmount();
	});
});
