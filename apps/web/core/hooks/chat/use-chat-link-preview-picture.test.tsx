/**
 * @jest-environment jsdom
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

const mockAsk = jest.fn<Promise<Blob | null>, [string]>();
let mockFlag = true;

jest.mock('@/core/services/client/api/chat/chat.service', () => ({
	chatService: { linkPreviewImage: (url: string) => mockAsk(url) }
}));
jest.mock('@/core/lib/utils/chat-enabled', () => ({ isChatLinkPreviewPicturesEnabled: () => mockFlag }));
jest.mock('./use-chat-scope', () => ({
	useChatScope: () => ({ tenantId: 'ten', organizationId: 'org', userId: 'usr', employeeId: 'emp' })
}));

import { useChatLinkPreviewPicture } from './use-chat-link-preview-picture';

function wrapper(client: QueryClient) {
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
	};
}

const newClient = () => new QueryClient();
const failure = (status: number) => Object.assign(new Error(`HTTP ${status}`), { response: { status } });

const created: string[] = [];
const revoked: string[] = [];
beforeAll(() => {
	let next = 0;
	URL.createObjectURL = jest.fn(() => {
		next += 1;
		const url = `blob:picture-${next}`;
		created.push(url);
		return url;
	});
	URL.revokeObjectURL = jest.fn((url: string) => {
		revoked.push(url);
	});
});

beforeEach(() => {
	mockAsk.mockReset();
	mockFlag = true;
	created.length = 0;
	revoked.length = 0;
});

describe('useChatLinkPreviewPicture', () => {
	it('shows the bytes the platform answered as an object URL, and releases it when the card goes', async () => {
		mockAsk.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
		const { result, unmount } = renderHook(() => useChatLinkPreviewPicture('https://a.io/page', true), {
			wrapper: wrapper(newClient())
		});

		await waitFor(() => expect(result.current).toBe('blob:picture-1'));
		expect(mockAsk).toHaveBeenCalledWith('https://a.io/page');
		unmount();
		expect(revoked).toEqual(['blob:picture-1']);
	});

	it('asks nothing when the preview names no picture, or the pictures are off here', async () => {
		renderHook(() => useChatLinkPreviewPicture('https://a.io/page', false), { wrapper: wrapper(newClient()) });
		mockFlag = false;
		renderHook(() => useChatLinkPreviewPicture('https://b.io/', true), { wrapper: wrapper(newClient()) });
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(mockAsk).not.toHaveBeenCalled();
	});

	it('shows no picture for a link without one (204)', async () => {
		mockAsk.mockResolvedValue(null);
		const { result } = renderHook(() => useChatLinkPreviewPicture('https://a.io/page', true), {
			wrapper: wrapper(newClient())
		});
		await waitFor(() => expect(mockAsk).toHaveBeenCalledTimes(1));
		expect(result.current).toBeNull();
		expect(created).toEqual([]);
	});

	it('stops asking for every link of the page once the platform says pictures are off (404)', async () => {
		mockAsk.mockRejectedValue(failure(404));
		const client = newClient();
		const first = renderHook(() => useChatLinkPreviewPicture('https://a.io/page', true), { wrapper: wrapper(client) });
		await waitFor(() => expect(mockAsk).toHaveBeenCalledTimes(1));
		expect(first.result.current).toBeNull();

		renderHook(() => useChatLinkPreviewPicture('https://b.io/', true), { wrapper: wrapper(client) });
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(mockAsk).toHaveBeenCalledTimes(1);
	});
});
