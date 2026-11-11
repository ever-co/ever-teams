/**
 * @jest-environment jsdom
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { IChatFile, IChatFilesQuery, IChatMessage } from '@/core/types/interfaces/common/chat';

const mockFiles = jest.fn();

jest.mock('@/core/services/client/api/chat/chat.service', () => ({
	CHAT_FILES_PAGE_SIZE: 2,
	chatService: { files: (conversationId: string, query?: IChatFilesQuery) => mockFiles(conversationId, query) }
}));
jest.mock('@/core/lib/utils/chat-enabled', () => ({ isChatEnabled: () => true }));
jest.mock('./use-chat-scope', () => ({
	useChatScope: () => ({ tenantId: 'ten', organizationId: 'org', userId: 'usr', employeeId: 'emp' })
}));

import { useChatFiles } from './use-chat-files';

function file(documentId: string): IChatFile {
	return {
		documentId,
		messageId: `m-${documentId}`,
		conversationId: 'c1',
		name: `${documentId}.pdf`,
		attachedAt: '2026-11-11T10:00:00.000Z'
	};
}

function message(id: string, attachmentIds: string[]): IChatMessage {
	return {
		id,
		conversationId: 'c1',
		kind: 'message',
		body: 'x',
		attachmentIds,
		mentionsChannel: false,
		mentionsHere: false,
		alsoInConversation: false,
		replyCount: 0,
		createdAt: '2026-11-11T10:00:00.000Z'
	};
}

function wrapper(client: QueryClient) {
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
	};
}

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

beforeEach(() => mockFiles.mockReset());

describe('useChatFiles', () => {
	it('reads the newest page and indexes the files by document', async () => {
		mockFiles.mockResolvedValue({ files: [file('a'), file('b')], hasMore: false });
		const { result } = renderHook(() => useChatFiles('c1'), { wrapper: wrapper(client()) });
		await waitFor(() => expect(result.current.files).toHaveLength(2));
		expect(mockFiles).toHaveBeenCalledWith('c1', { skip: 0, limit: 2 });
		expect(result.current.byId.get('b')?.name).toBe('b.pdf');
		expect(result.current.hasMore).toBe(false);
	});

	it('reads the list again for a file a new message names, then older pages, and stops once it is found', async () => {
		mockFiles
			.mockResolvedValueOnce({ files: [file('a')], hasMore: true })
			// The read again: still not there (it is older than the first page).
			.mockResolvedValueOnce({ files: [file('a')], hasMore: true })
			// The next page has it.
			.mockResolvedValueOnce({ files: [file('old')], hasMore: false });
		const messages = [message('m1', ['a']), message('m2', ['old'])];
		const { result } = renderHook(() => useChatFiles('c1', messages), { wrapper: wrapper(client()) });
		await waitFor(() => expect(result.current.byId.has('old')).toBe(true));
		expect(mockFiles.mock.calls.map(([, query]) => query.skip)).toEqual([0, 0, 1]);
	});

	it('asks nothing when no conversation is open', () => {
		renderHook(() => useChatFiles(null), { wrapper: wrapper(client()) });
		expect(mockFiles).not.toHaveBeenCalled();
	});

	it('stays empty on a platform without the route', async () => {
		mockFiles.mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }));
		const { result } = renderHook(() => useChatFiles('c1', [message('m1', ['a'])]), { wrapper: wrapper(client()) });
		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.files).toEqual([]);
		expect(mockFiles).toHaveBeenCalledTimes(1);
	});
});
