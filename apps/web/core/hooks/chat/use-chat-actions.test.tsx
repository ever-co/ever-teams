/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockSend = jest.fn();
const mockDiscard = jest.fn();

jest.mock('@/core/services/client/api/chat', () => ({
	chatService: {
		send: (...args: unknown[]) => mockSend(...args),
		discardAttachment: (documentId: string) => mockDiscard(documentId)
	}
}));
jest.mock('./use-chat-scope', () => ({ useChatScope: () => ({ tenantId: 't1', organizationId: 'o1', userId: 'user-me', employeeId: 'employee-me' }) }));

import { queryKeys } from '@/core/query/keys';
import type { IChatMessage } from '@/core/types/interfaces/common/chat';
import { useChatActions, type ChatOutboxMessage } from './use-chat-actions';
import type { ChatMessagesCache } from './use-chat-messages';

const KEY = queryKeys.chat.messages('t1', 'c1');

function setup() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	client.setQueryData<ChatMessagesCache>(KEY, { messages: [], hasBefore: false, hasAfter: false, serverNewestId: null });
	const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
	const { result } = renderHook(() => useChatActions(), { wrapper });
	return { client, result };
}

const held = (client: QueryClient) => client.getQueryData<ChatMessagesCache>(KEY)?.messages ?? [];

beforeEach(() => {
	mockSend.mockReset();
	mockDiscard.mockReset();
	mockDiscard.mockResolvedValue({ discarded: true });
});

describe('useChatActions, a message of files only', () => {
	it('is sent with an empty body, and shows meanwhile with the names of the picked files', async () => {
		let answer: (value: unknown) => void = () => undefined;
		mockSend.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
		const { client, result } = setup();
		let sent: Promise<unknown> = Promise.resolve();
		act(() => {
			sent = result.current.send('c1', { body: '', attachmentIds: ['doc-1', 'doc-2'] }, { attachmentNames: 'plan.pdf\nshot.png' });
		});
		const [pending] = held(client) as ChatOutboxMessage[];
		expect(pending).toEqual(expect.objectContaining({ body: '', outbox: 'pending', attachmentIds: ['doc-1', 'doc-2'], attachmentNames: 'plan.pdf\nshot.png' }));
		expect(mockSend).toHaveBeenCalledWith('c1', expect.objectContaining({ body: '', attachmentIds: ['doc-1', 'doc-2'], mentionEmployeeIds: [] }));
		expect(mockSend.mock.calls[0][1]).not.toHaveProperty('attachmentNames');
		const message: IChatMessage = { ...pending, id: 'm1', attachmentNames: 'plan.pdf\nshot.png' };
		await act(async () => {
			answer({ message, events: [] });
			await sent;
		});
		expect(held(client).map((entry) => entry.id)).toEqual(['m1']);
	});

	it('lets the files of a failed message go when it is discarded', async () => {
		mockSend.mockRejectedValue(new Error('offline'));
		const { client, result } = setup();
		await act(async () => {
			await result.current.send('c1', { body: '', attachmentIds: ['doc-1'] }, { attachmentNames: 'plan.pdf' }).catch(() => undefined);
		});
		const [failed] = held(client) as ChatOutboxMessage[];
		expect(failed.outbox).toBe('failed');
		expect(mockDiscard).not.toHaveBeenCalled();
		act(() => result.current.discardFailed('c1', failed));
		expect(held(client)).toEqual([]);
		expect(mockDiscard).toHaveBeenCalledWith('doc-1');
	});
});
