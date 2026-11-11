/**
 * @jest-environment jsdom
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { EChatLinkPreviewStatus, type IChatLinkPreview } from '@/core/types/interfaces/common/chat';
import type { ChatPreviewLink } from '@/core/lib/utils/chat-link-preview';

const mockAsk = jest.fn<Promise<IChatLinkPreview>, [string]>();
let mockFlag = true;

jest.mock('@/core/services/client/api/chat/chat.service', () => ({
	chatService: { linkPreview: (url: string) => mockAsk(url) }
}));
jest.mock('@/core/lib/utils/chat-enabled', () => ({ isChatLinkPreviewsEnabled: () => mockFlag }));
jest.mock('./use-chat-scope', () => ({
	useChatScope: () => ({ tenantId: 'ten', organizationId: 'org', userId: 'usr', employeeId: 'emp' })
}));

import { useChatLinkPreviews } from './use-chat-link-previews';

const A: ChatPreviewLink = { href: 'https://a.io/page#top', url: 'https://a.io/page' };
const B: ChatPreviewLink = { href: 'https://b.io/', url: 'https://b.io/' };

function ready(url: string, title: string): IChatLinkPreview {
	return { url, status: EChatLinkPreviewStatus.Ready, title, siteName: 'Site' };
}

function wrapper(client: QueryClient) {
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
	};
}

const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

beforeEach(() => {
	mockAsk.mockReset();
	mockFlag = true;
});

describe('useChatLinkPreviews', () => {
	it('asks nothing with the flag off', async () => {
		mockFlag = false;
		const { result } = renderHook(() => useChatLinkPreviews([A]), { wrapper: wrapper(newClient()) });
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(result.current).toEqual([]);
		expect(mockAsk).not.toHaveBeenCalled();
	});

	it('shows the card of a ready preview, and asks once for a link two messages carry', async () => {
		mockAsk.mockImplementation((url) => Promise.resolve(ready(url, `Title of ${url}`)));
		const client = newClient();
		const first = renderHook(() => useChatLinkPreviews([A, B]), { wrapper: wrapper(client) });
		const second = renderHook(() => useChatLinkPreviews([A]), { wrapper: wrapper(client) });
		await waitFor(() => expect(first.result.current).toHaveLength(2));
		await waitFor(() => expect(second.result.current).toHaveLength(1));
		expect(first.result.current[0]).toMatchObject({
			href: 'https://a.io/page#top',
			title: 'Title of https://a.io/page',
			site: 'Site'
		});
		expect(mockAsk.mock.calls.map(([url]) => url).sort()).toEqual(['https://a.io/page', 'https://b.io/']);
	});

	it('hides the previews for the page after one 404, and asks nothing more', async () => {
		mockAsk.mockRejectedValue(Object.assign(new Error('Not Found'), { response: { status: 404 } }));
		const client = newClient();
		const { result } = renderHook(() => useChatLinkPreviews([A, B]), { wrapper: wrapper(client) });
		await waitFor(() => expect(mockAsk).toHaveBeenCalledTimes(1));
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(result.current).toEqual([]);
		const later = renderHook(() => useChatLinkPreviews([{ href: 'https://c.io/', url: 'https://c.io/' }]), {
			wrapper: wrapper(client)
		});
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(later.result.current).toEqual([]);
		expect(mockAsk).toHaveBeenCalledTimes(1);
	});

	it('does not ask again for a link without a preview, even once its answer left the cache', async () => {
		mockAsk.mockResolvedValue({ url: A.url, status: EChatLinkPreviewStatus.Unavailable });
		const client = newClient();
		const first = renderHook(() => useChatLinkPreviews([A]), { wrapper: wrapper(client) });
		await waitFor(() => expect(mockAsk).toHaveBeenCalledTimes(1));
		first.unmount();
		client.removeQueries();
		const again = renderHook(() => useChatLinkPreviews([A]), { wrapper: wrapper(client) });
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(again.result.current).toEqual([]);
		expect(mockAsk).toHaveBeenCalledTimes(1);
	});
});
