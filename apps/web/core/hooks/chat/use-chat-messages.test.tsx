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
import { refreshHeldMessage, useChatMessages, type ChatMessagesCache } from './use-chat-messages';

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
