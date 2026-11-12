/**
 * @jest-environment jsdom
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { nextMessageOrder, withMessageOrder } from '@/core/lib/utils/chat-format';
import type { IChatMessage } from '@/core/types/interfaces/common/chat';

jest.mock('@/core/services/client/api/chat', () => ({ chatService: {} }));
jest.mock('./use-chat-scope', () => ({
	useChatScope: () => ({ tenantId: 'ten', organizationId: 'org', userId: 'usr', employeeId: 'emp' })
}));

import { queryKeys } from '@/core/query/keys';
import { useChatActions } from './use-chat-actions';
import type { ChatMessagesCache } from './use-chat-messages';

function appMessage(extra: Partial<IChatMessage> = {}): IChatMessage {
	return {
		id: 'm1',
		conversationId: 'c1',
		kind: 'app',
		body: 'CPU high',
		appName: 'Monitor',
		mentionsChannel: false,
		mentionsHere: false,
		alsoInConversation: false,
		replyCount: 0,
		createdAt: '2026-11-11T10:00:00.000Z',
		...extra
	};
}

describe('useChatActions().applyAppReply', () => {
	const key = queryKeys.chat.messages('ten', 'c1');

	function setup(held: IChatMessage) {
		const client = new QueryClient();
		client.setQueryData<ChatMessagesCache>(key, { messages: [held], hasBefore: false, hasAfter: false, serverNewestId: held.id });
		const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
		const { result } = renderHook(() => useChatActions(), { wrapper });
		const held1 = () => client.getQueryData<ChatMessagesCache>(key)?.messages[0];
		return { result, held: held1 };
	}

	it('shows the app reply in place of the message', () => {
		const { result, held } = setup(appMessage());
		const reply = appMessage({ body: 'Acknowledged by Ana', blocks: [], editedAt: '2026-11-11T10:05:00.000Z' });
		act(() => result.current.applyAppReply(appMessage(), withMessageOrder([reply], nextMessageOrder())[0]));
		expect(held()?.body).toBe('Acknowledged by Ana');
	});

	it('keeps a change applied while the reply was on its way: a reaction, and a deletion', () => {
		// The read of the reply started first; a reaction (same edit time) was applied after it started.
		const readOrder = nextMessageOrder();
		const reacted = withMessageOrder([appMessage({ body: 'Acknowledged by Ana', editedAt: '2026-11-11T10:05:00.000Z', reactions: [{ emoji: '👍', count: 1, mine: true }] })], nextMessageOrder())[0];
		const late = withMessageOrder([appMessage({ body: 'Acknowledged by Ana', editedAt: '2026-11-11T10:05:00.000Z' })], readOrder)[0];
		const first = setup(reacted);
		act(() => first.result.current.applyAppReply(appMessage(), late));
		expect(first.held()?.reactions).toHaveLength(1);

		// A deletion is final: a reply read before it never brings the message back.
		const deleted = appMessage({ body: '', deletedAt: '2026-11-11T10:06:00.000Z' });
		const second = setup(deleted);
		act(() => second.result.current.applyAppReply(appMessage(), late));
		expect(second.held()?.deletedAt).toBe('2026-11-11T10:06:00.000Z');
	});

	it('stamps a reply that comes without an order as applied now', () => {
		const { result, held } = setup(withMessageOrder([appMessage()], nextMessageOrder())[0]);
		act(() => result.current.applyAppReply(appMessage(), appMessage({ body: 'Done' })));
		expect(held()?.body).toBe('Done');
	});
});
