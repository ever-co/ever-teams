/**
 * @jest-environment jsdom
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';

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
// The shape the services throw (`ApiErrorService`): the status as `statusCode`, no axios `response`.
const failure = (status: number) =>
	Object.assign(new Error(`HTTP ${status}`), { statusCode: status, httpResponseStatus: status });

beforeEach(() => {
	mockAsk.mockReset();
	mockFlag = true;
});

describe('useChatLinkPreviewPicture', () => {
	it('answers the bytes the platform served', async () => {
		const bytes = new Blob(['png'], { type: 'image/png' });
		mockAsk.mockResolvedValue(bytes);
		const { result } = renderHook(() => useChatLinkPreviewPicture('https://a.io/page', true), {
			wrapper: wrapper(newClient())
		});

		await waitFor(() => expect(result.current).toBe(bytes));
		expect(mockAsk).toHaveBeenCalledWith('https://a.io/page');
	});

	it('asks nothing when the preview names no picture, or the pictures are off here', async () => {
		renderHook(() => useChatLinkPreviewPicture('https://a.io/page', false), { wrapper: wrapper(newClient()) });
		mockFlag = false;
		renderHook(() => useChatLinkPreviewPicture('https://b.io/', true), { wrapper: wrapper(newClient()) });
		await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
		expect(mockAsk).not.toHaveBeenCalled();
	});

	it('shows no picture for a link without one (204)', async () => {
		mockAsk.mockResolvedValue(null);
		const { result } = renderHook(() => useChatLinkPreviewPicture('https://a.io/page', true), {
			wrapper: wrapper(newClient())
		});
		await waitFor(() => expect(mockAsk).toHaveBeenCalledTimes(1));
		expect(result.current).toBeNull();
	});

	it('stops asking for every link of the page once the platform says pictures are off (404)', async () => {
		mockAsk.mockRejectedValue(failure(404));
		const client = newClient();
		const first = renderHook(() => useChatLinkPreviewPicture('https://a.io/page', true), {
			wrapper: wrapper(client)
		});
		await waitFor(() => expect(mockAsk).toHaveBeenCalledTimes(1));
		expect(first.result.current).toBeNull();

		await act(() => new Promise((resolve) => setTimeout(resolve, 20)));

		renderHook(() => useChatLinkPreviewPicture('https://b.io/', true), { wrapper: wrapper(client) });
		await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
		expect(mockAsk).toHaveBeenCalledTimes(1);
	});

	it('drops a waiting retry once another card learned that pictures are off (404)', async () => {
		jest.useFakeTimers();
		try {
			mockAsk.mockImplementation((url) => Promise.reject(failure(url === 'https://b.io/' ? 404 : 503)));
			const client = newClient();
			const busy = renderHook(() => useChatLinkPreviewPicture('https://a.io/page', true), {
				wrapper: wrapper(client)
			});
			await act(() => jest.advanceTimersByTimeAsync(0));
			expect(mockAsk).toHaveBeenCalledTimes(1);

			renderHook(() => useChatLinkPreviewPicture('https://b.io/', true), { wrapper: wrapper(client) });
			await act(() => jest.advanceTimersByTimeAsync(0));
			expect(mockAsk).toHaveBeenCalledTimes(2);

			// The first card's retry comes due: the platform is not asked again.
			await act(() => jest.advanceTimersByTimeAsync(15_000));
			expect(mockAsk).toHaveBeenCalledTimes(2);
			expect(busy.result.current).toBeNull();
		} finally {
			jest.useRealTimers();
		}
	});

	it('asks a busy platform (503) twice more, a while apart, then leaves the card text only', async () => {
		jest.useFakeTimers();
		try {
			mockAsk.mockRejectedValue(failure(503));
			const { result } = renderHook(() => useChatLinkPreviewPicture('https://a.io/page', true), {
				wrapper: wrapper(newClient())
			});
			await act(() => jest.advanceTimersByTimeAsync(0));
			expect(mockAsk).toHaveBeenCalledTimes(1);
			await act(() => jest.advanceTimersByTimeAsync(5_000));
			expect(mockAsk).toHaveBeenCalledTimes(2);
			await act(() => jest.advanceTimersByTimeAsync(5_000));
			expect(mockAsk).toHaveBeenCalledTimes(3);
			await act(() => jest.advanceTimersByTimeAsync(30_000));
			expect(mockAsk).toHaveBeenCalledTimes(3);
			expect(result.current).toBeNull();
		} finally {
			jest.useRealTimers();
		}
	});
});
