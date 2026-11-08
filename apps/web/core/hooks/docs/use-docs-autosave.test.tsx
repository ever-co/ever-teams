/**
 * @jest-environment jsdom
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { IDocumentPage } from '@/core/types/interfaces/common/docs';

const mockUpdateContent = jest.fn();

jest.mock('@/core/services/client/api/docs', () => ({
	docsService: { updateContent: (...args: unknown[]) => mockUpdateContent(...args), getPage: jest.fn() }
}));

jest.mock('@/core/services/client/api-error.service', () => ({
	ApiErrorService: {
		isApiError: (error: unknown) => typeof error === 'object' && error !== null && 'statusCode' in error
	}
}));

jest.mock('./use-docs-scope', () => ({
	useDocsScope: () => ({ tenantId: 'ten', organizationId: 'org', userId: 'usr', employeeId: null })
}));

import { useDocsAutosave, useEditorPageHtml } from './use-docs-autosave';

function pageOf(id: string): IDocumentPage {
	return { id, updatedAt: '2026-01-01T00:00:00.000Z', version: 1, contentHtml: '<p>theirs</p>' } as unknown as IDocumentPage;
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

function setup() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
	return { client, wrapper };
}

describe('useDocsAutosave, leaving a page', () => {
	it('keeps the text when the departure save fails, and gives it back with the refusal on return', async () => {
		const { wrapper } = setup();
		const page = pageOf('page-failing');
		mockUpdateContent.mockRejectedValueOnce(new Error('offline'));

		const first = renderHook(() => useDocsAutosave(page), { wrapper });
		act(() => first.result.current.change('<p>mine</p>', null));
		first.unmount();
		await waitFor(() => expect(mockUpdateContent).toHaveBeenCalledTimes(1));
		await act(async () => {});

		const back = renderHook(() => useDocsAutosave(page), { wrapper });
		expect(back.result.current.restoredHtml).toBe('<p>mine</p>');
		expect(back.result.current.state).toBe('error');
		expect(back.result.current.hasDraft()).toBe(true);
	});

	it('drops the kept copy once the departure save lands', async () => {
		const { wrapper } = setup();
		const page = pageOf('page-saved');
		mockUpdateContent.mockResolvedValueOnce({ ...page, updatedAt: '2026-01-01T00:01:00.000Z', version: 2 });

		const first = renderHook(() => useDocsAutosave(page), { wrapper });
		act(() => first.result.current.change('<p>mine</p>', null));
		first.unmount();
		await waitFor(() => expect(mockUpdateContent).toHaveBeenCalledTimes(1));
		await act(async () => {});

		const back = renderHook(() => useDocsAutosave(page), { wrapper });
		expect(back.result.current.restoredHtml).toBeNull();
		expect(back.result.current.state).toBe('idle');
		expect(back.result.current.hasDraft()).toBe(false);
	});

	it('keeps the text typed during a running save while the save queued behind it is pending, and after it fails', async () => {
		const { wrapper } = setup();
		const page = pageOf('page-queued');
		const running = deferred<IDocumentPage>();
		mockUpdateContent.mockReturnValueOnce(running.promise).mockRejectedValueOnce({ statusCode: 423 });

		const first = renderHook(() => useDocsAutosave(page), { wrapper });
		act(() => first.result.current.change('<p>first</p>', null));
		act(() => void first.result.current.flushNow());
		act(() => first.result.current.change('<p>first and more</p>', null));
		first.unmount();

		// The running save is of the older text: the newer one is kept while it runs.
		running.resolve({ ...page, updatedAt: '2026-01-01T00:01:00.000Z', version: 2 });
		await waitFor(() => expect(mockUpdateContent).toHaveBeenCalledTimes(2));
		expect(mockUpdateContent.mock.calls[1][1]).toMatchObject({ contentHtml: '<p>first and more</p>' });
		await act(async () => {});

		const back = renderHook(() => useDocsAutosave(page), { wrapper });
		expect(back.result.current.restoredHtml).toBe('<p>first and more</p>');
		expect(back.result.current.state).toBe('locked');
	});

	it('coming back before the departure save lands: its result reaches the editor, which then saves at the new clock', async () => {
		const { wrapper } = setup();
		const page = pageOf('page-return');
		const savedPage = { ...page, updatedAt: '2026-01-01T00:01:00.000Z', version: 2 } as IDocumentPage;
		const running = deferred<IDocumentPage>();
		mockUpdateContent.mockReturnValueOnce(running.promise);

		const first = renderHook(() => useDocsAutosave(page), { wrapper });
		act(() => first.result.current.change('<p>mine</p>', null));
		first.unmount();

		const back = renderHook(({ current }: { current: IDocumentPage }) => useDocsAutosave(current), { wrapper, initialProps: { current: page } });
		expect(back.result.current.restoredHtml).toBe('<p>mine</p>');
		expect(back.result.current.state).toBe('dirty');

		await act(async () => {
			running.resolve(savedPage);
		});
		// The page query now holds the clock of that save (the save patches the cache).
		back.rerender({ current: savedPage });
		expect(back.result.current.state).toBe('saved');
		expect(back.result.current.hasDraft()).toBe(false);

		mockUpdateContent.mockResolvedValueOnce({ ...savedPage, updatedAt: '2026-01-01T00:02:00.000Z', version: 3 });
		act(() => back.result.current.change('<p>mine, and more</p>', null));
		await act(async () => {
			await back.result.current.flushNow();
		});
		expect(mockUpdateContent).toHaveBeenLastCalledWith('page-return', expect.objectContaining({ expectedUpdatedAt: '2026-01-01T00:01:00.000Z' }));
		expect(back.result.current.state).toBe('saved');
	});

	it('still keeps a draft waiting for a decision (a conflict) without saving it', async () => {
		const { wrapper } = setup();
		const page = pageOf('page-conflict');
		mockUpdateContent.mockRejectedValueOnce({ statusCode: 409 });

		const first = renderHook(() => useDocsAutosave(page), { wrapper });
		act(() => first.result.current.change('<p>mine</p>', null));
		await act(async () => {
			await first.result.current.flushNow();
		});
		expect(first.result.current.state).toBe('conflict');
		first.unmount();
		await act(async () => {});

		expect(mockUpdateContent).toHaveBeenCalledTimes(1);
		const back = renderHook(() => useDocsAutosave(page), { wrapper });
		expect(back.result.current.restoredHtml).toBe('<p>mine</p>');
		expect(back.result.current.state).toBe('conflict');
	});
});

describe('useEditorPageHtml, a refreshed page', () => {
	type Props = { pageId: string | null; html: string; hasDraft: boolean };
	const render = (initialProps: Props) => renderHook(({ pageId, html, hasDraft }: Props) => useEditorPageHtml(pageId, html, hasDraft), { initialProps });

	it('reaches the editor while nothing typed here is unsaved', () => {
		const view = render({ pageId: 'p1', html: '<p>one</p>', hasDraft: false });
		view.rerender({ pageId: 'p1', html: '<p>theirs</p>', hasDraft: false });
		expect(view.result.current).toBe('<p>theirs</p>');
	});

	it('waits while a draft is open, and arrives once it is saved or dropped', () => {
		const view = render({ pageId: 'p1', html: '<p>one</p>', hasDraft: true });
		view.rerender({ pageId: 'p1', html: '<p>theirs</p>', hasDraft: true });
		expect(view.result.current).toBe('<p>one</p>');
		view.rerender({ pageId: 'p1', html: '<p>theirs</p>', hasDraft: false });
		expect(view.result.current).toBe('<p>theirs</p>');
	});

	it('never holds the text of another page', () => {
		const view = render({ pageId: 'p1', html: '<p>one</p>', hasDraft: true });
		view.rerender({ pageId: 'p2', html: '<p>two</p>', hasDraft: true });
		expect(view.result.current).toBe('<p>two</p>');
		view.rerender({ pageId: 'p2', html: '<p>two, theirs</p>', hasDraft: true });
		expect(view.result.current).toBe('<p>two</p>');
	});
});
