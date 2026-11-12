/** @jest-environment jsdom */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';

const mockComments = { getAll: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn() };
const mockDocs = { commentAnchors: jest.fn(), setCommentAnchor: jest.fn() };

jest.mock('@/core/services/client/api/comments', () => ({
	get commentService() {
		return mockComments;
	}
}));
jest.mock('@/core/services/client/api/docs', () => ({
	get docsService() {
		return mockDocs;
	}
}));
jest.mock('./use-docs-scope', () => ({ useDocsScope: () => ({ tenantId: 'tenant-1', organizationId: 'org-1', userId: 'user-1', employeeId: 'emp-1' }) }));
// An answer of the platform with its status and code, as the client's errors carry them.
jest.mock('@/core/services/client/api-error.service', () => ({
	ApiErrorService: { isApiError: (error: unknown) => Boolean((error as { statusCode?: number })?.statusCode) }
}));

import { useDocsComments } from './use-docs-comments';

const refusal = (statusCode: number, errorCode?: string) =>
	Object.assign(new Error(`HTTP ${statusCode}`), { statusCode, errorCode, isEndpointUnavailable: () => statusCode === 404 });

const RANGE = { blockId: 'b1', start: 4, end: 9, quote: 'quick' };

function wrapper() {
	const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0, gcTime: 0 } } });
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
	};
}

describe('useDocsComments, the ranges of threads', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		mockComments.getAll.mockResolvedValue({ items: [] });
		mockComments.create.mockResolvedValue({ id: 'c1' });
	});

	it("reads the page's ranges by thread, and stores a new thread's range right after posting it", async () => {
		mockDocs.commentAnchors.mockResolvedValue({
			documentId: 'page-1',
			revision: 2,
			live: false,
			items: [{ ...RANGE, commentId: 'c0', documentId: 'page-1', position: { status: 'exact', method: 'offsets', blockId: 'b1', start: 4, end: 9, text: 'quick' } }]
		});
		mockDocs.setCommentAnchor.mockResolvedValue({});
		const { result } = renderHook(() => useDocsComments({ id: 'page-1', name: 'Page' }, true), { wrapper: wrapper() });

		await waitFor(() => expect(result.current.anchorsSettled).toBe(true));
		expect(result.current.anchorsSupported).toBe(true);
		expect([...result.current.anchors.keys()]).toEqual(['c0']);

		await act(async () => {
			await result.current.post({ body: 'Nice', blockId: 'b1', range: RANGE });
		});
		expect(mockComments.create).toHaveBeenCalledWith(expect.objectContaining({ comment: expect.stringContaining('[[block:b1]]') }));
		expect(mockDocs.setCommentAnchor).toHaveBeenCalledWith('page-1', 'c1', RANGE);
	});

	it('stores no range for a reply, or for a range of another block', async () => {
		mockDocs.commentAnchors.mockResolvedValue({ documentId: 'page-1', revision: 1, live: false, items: [] });
		const { result } = renderHook(() => useDocsComments({ id: 'page-1' }, true), { wrapper: wrapper() });
		await waitFor(() => expect(result.current.anchorsSettled).toBe(true));

		await act(async () => {
			await result.current.post({ body: 'Reply', blockId: 'b1', parentId: 'c0', range: RANGE });
			await result.current.post({ body: 'Elsewhere', blockId: 'b2', range: RANGE });
		});
		expect(mockComments.create).toHaveBeenCalledTimes(2);
		expect(mockDocs.setCommentAnchor).not.toHaveBeenCalled();
	});

	it('keeps every thread on its block, silently, on a platform without ranges (404), and asks no more', async () => {
		mockDocs.commentAnchors.mockRejectedValue(refusal(404, 'DOCS_COLLAB_DISABLED'));
		const { result } = renderHook(() => useDocsComments({ id: 'page-1' }, true), { wrapper: wrapper() });
		await waitFor(() => expect(result.current.anchorsSettled).toBe(true));
		expect(result.current.anchorsSupported).toBe(false);

		let created: unknown;
		await act(async () => {
			created = await result.current.post({ body: 'On text', blockId: 'b1', range: RANGE });
		});
		expect(created).toEqual({ id: 'c1' });
		expect(mockDocs.setCommentAnchor).not.toHaveBeenCalled();
	});

	it('posts the comment even when its range is refused, and keeps asking after a comment the platform did not find', async () => {
		mockDocs.commentAnchors.mockResolvedValue({ documentId: 'page-1', revision: 1, live: false, items: [] });
		mockDocs.setCommentAnchor.mockRejectedValueOnce(refusal(404, 'DOCS_COMMENT_NOT_FOUND')).mockRejectedValueOnce(refusal(403, 'DOCS_COMMENT_ANCHOR_FORBIDDEN'));
		const { result } = renderHook(() => useDocsComments({ id: 'page-1' }, true), { wrapper: wrapper() });
		await waitFor(() => expect(result.current.anchorsSettled).toBe(true));

		await act(async () => {
			await expect(result.current.post({ body: 'One', blockId: 'b1', range: RANGE })).resolves.toEqual({ id: 'c1' });
			await expect(result.current.post({ body: 'Two', blockId: 'b1', range: RANGE })).resolves.toEqual({ id: 'c1' });
		});
		expect(mockDocs.setCommentAnchor).toHaveBeenCalledTimes(2);
	});
});
