/**
 * @jest-environment jsdom
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { IDocumentNode, IDocumentPage } from '@/core/types/interfaces/common/docs';

const mockUpdateContent = jest.fn();
const mockGetPage = jest.fn();

jest.mock('@/core/services/client/api/docs', () => ({
	docsService: { updateContent: (...args: unknown[]) => mockUpdateContent(...args), getPage: (...args: unknown[]) => mockGetPage(...args) }
}));

jest.mock('@/core/services/client/api-error.service', () => ({
	ApiErrorService: {
		isApiError: (error: unknown) => typeof error === 'object' && error !== null && 'statusCode' in error
	}
}));

jest.mock('./use-docs-scope', () => ({
	useDocsScope: () => ({ tenantId: 'ten', organizationId: 'org', userId: 'usr', employeeId: null })
}));

import { useDocsAutosave, useEditorPageContent } from './use-docs-autosave';

const T1 = '2026-01-01T00:01:00.000Z';
const T2 = '2026-01-01T00:02:00.000Z';
const T3 = '2026-01-01T00:03:00.000Z';
const T5 = '2026-01-01T00:05:00.000Z';

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

	it('coming back before the departure save lands: the editor waits for it, hears it, and saves on at the new clock', async () => {
		const { wrapper } = setup();
		const page = pageOf('page-return');
		const running = deferred<IDocumentPage>();
		mockUpdateContent.mockReturnValueOnce(running.promise);

		const first = renderHook(() => useDocsAutosave(page), { wrapper });
		act(() => first.result.current.change('<p>mine</p>', null));
		first.unmount();

		const back = renderHook(() => useDocsAutosave(page), { wrapper });
		expect(back.result.current.restoredHtml).toBe('<p>mine</p>');
		expect(back.result.current.state).toBe('saving');
		// A save asked meanwhile waits for the running one: the same text is not sent twice.
		await act(async () => {
			await back.result.current.flushNow();
		});
		expect(mockUpdateContent).toHaveBeenCalledTimes(1);

		await act(async () => {
			running.resolve({ ...page, updatedAt: T1, version: 2 });
		});
		expect(back.result.current.state).toBe('saved');
		expect(back.result.current.hasDraft()).toBe(false);
		// The restored text retires, so a later refresh of the page reaches the editor again.
		expect(back.result.current.restoredHtml).toBeNull();
		await act(async () => {});
		expect(mockUpdateContent).toHaveBeenCalledTimes(1);

		mockUpdateContent.mockResolvedValueOnce({ ...page, updatedAt: T2, version: 3 });
		act(() => back.result.current.change('<p>mine, and more</p>', null));
		await act(async () => {
			await back.result.current.flushNow();
		});
		expect(mockUpdateContent).toHaveBeenLastCalledWith('page-return', expect.objectContaining({ expectedUpdatedAt: T1 }));
		expect(back.result.current.state).toBe('saved');
	});

	it('coming back while a newer draft waits behind a running save: both clock moves reach the editor', async () => {
		const { wrapper } = setup();
		const page = pageOf('page-two-moves');
		const firstSave = deferred<IDocumentPage>();
		const secondSave = deferred<IDocumentPage>();
		mockUpdateContent.mockReturnValueOnce(firstSave.promise).mockReturnValueOnce(secondSave.promise);

		const first = renderHook(() => useDocsAutosave(page), { wrapper });
		act(() => first.result.current.change('<p>one</p>', null));
		act(() => void first.result.current.flushNow());
		act(() => first.result.current.change('<p>one, two</p>', null));
		first.unmount();

		const back = renderHook(() => useDocsAutosave(page), { wrapper });
		expect(back.result.current.restoredHtml).toBe('<p>one, two</p>');

		await act(async () => {
			firstSave.resolve({ ...page, updatedAt: T1, version: 2 });
		});
		await waitFor(() => expect(mockUpdateContent).toHaveBeenCalledTimes(2));
		expect(mockUpdateContent.mock.calls[1][1]).toMatchObject({ contentHtml: '<p>one, two</p>', expectedUpdatedAt: T1 });
		expect(back.result.current.hasDraft()).toBe(true);

		await act(async () => {
			secondSave.resolve({ ...page, updatedAt: T2, version: 3 });
		});
		expect(back.result.current.state).toBe('saved');
		expect(back.result.current.hasDraft()).toBe(false);

		mockUpdateContent.mockResolvedValueOnce({ ...page, updatedAt: T3, version: 4 });
		act(() => back.result.current.change('<p>one, two, three</p>', null));
		await act(async () => {
			await back.result.current.flushNow();
		});
		expect(mockUpdateContent).toHaveBeenCalledTimes(3);
		expect(mockUpdateContent.mock.calls[2][1]).toMatchObject({ expectedUpdatedAt: T2 });
	});

	it('coming back before the departure save is refused: the editor shows the refusal for that draft', async () => {
		const { wrapper } = setup();
		const page = pageOf('page-refused-later');
		const running = deferred<IDocumentPage>();
		mockUpdateContent.mockReturnValueOnce(running.promise);

		const first = renderHook(() => useDocsAutosave(page), { wrapper });
		act(() => first.result.current.change('<p>mine</p>', null));
		first.unmount();

		const back = renderHook(() => useDocsAutosave(page), { wrapper });
		await act(async () => {
			running.reject({ statusCode: 409 });
		});
		expect(back.result.current.state).toBe('conflict');
		expect(back.result.current.hasDraft()).toBe(true);
		expect(back.result.current.restoredHtml).toBe('<p>mine</p>');
	});

	it('a kept draft states the clock it was written against, so an update made meanwhile is a conflict, not overwritten', async () => {
		const { wrapper } = setup();
		const page = pageOf('page-base');
		mockUpdateContent.mockRejectedValueOnce(new Error('offline'));

		const first = renderHook(() => useDocsAutosave(page), { wrapper });
		act(() => first.result.current.change('<p>mine</p>', null));
		first.unmount();
		await waitFor(() => expect(mockUpdateContent).toHaveBeenCalledTimes(1));
		await act(async () => {});

		// Someone else saved the page meanwhile: the page comes back with a newer clock.
		const updatedElsewhere = { ...page, updatedAt: T5, version: 7 } as IDocumentPage;
		const back = renderHook(() => useDocsAutosave(updatedElsewhere), { wrapper });
		expect(back.result.current.state).toBe('error');
		mockUpdateContent.mockRejectedValueOnce({ statusCode: 409 });
		await act(async () => {
			await back.result.current.flushNow();
		});
		expect(mockUpdateContent.mock.calls[1][1]).toMatchObject({ contentHtml: '<p>mine</p>', expectedUpdatedAt: page.updatedAt });
		expect(back.result.current.state).toBe('conflict');
	});

	it('a Keep Mine asked while a save runs keeps its forced snapshot when it goes', async () => {
		const { wrapper } = setup();
		const page = pageOf('page-keep-mine');
		const running = deferred<IDocumentPage>();
		mockUpdateContent.mockReturnValueOnce(running.promise).mockResolvedValueOnce({ ...page, updatedAt: T2, version: 3 });
		mockGetPage.mockResolvedValueOnce({ ...page, updatedAt: T1, version: 2 });

		const view = renderHook(() => useDocsAutosave(page), { wrapper });
		act(() => view.result.current.change('<p>mine</p>', null));
		act(() => void view.result.current.flushNow());
		await act(async () => {
			await view.result.current.keepMine();
		});
		expect(mockUpdateContent).toHaveBeenCalledTimes(1);

		await act(async () => {
			running.reject({ statusCode: 409 });
		});
		await waitFor(() => expect(mockUpdateContent).toHaveBeenCalledTimes(2));
		expect(mockUpdateContent.mock.calls[1][1]).toMatchObject({ forceSnapshot: true, expectedUpdatedAt: T1, contentHtml: '<p>mine</p>' });
		await waitFor(() => expect(view.result.current.state).toBe('saved'));
	});

	it('the text left behind never follows newer text typed after coming back: only the latest draft is saved', async () => {
		const { wrapper } = setup();
		const page = pageOf('page-superseded');
		const firstSave = deferred<IDocumentPage>();
		mockUpdateContent.mockReturnValueOnce(firstSave.promise).mockResolvedValueOnce({ ...page, updatedAt: T2, version: 3 });

		const first = renderHook(() => useDocsAutosave(page), { wrapper });
		act(() => first.result.current.change('<p>one</p>', null));
		act(() => void first.result.current.flushNow());
		act(() => first.result.current.change('<p>one, two</p>', null));
		first.unmount();

		const back = renderHook(() => useDocsAutosave(page), { wrapper });
		act(() => back.result.current.change('<p>one, two, three</p>', null));
		await act(async () => {
			await back.result.current.flushNow();
		});
		await act(async () => {
			firstSave.resolve({ ...page, updatedAt: T1, version: 2 });
		});
		await waitFor(() => expect(back.result.current.state).toBe('saved'));
		await act(async () => {});

		expect(mockUpdateContent.mock.calls.map((call) => (call[1] as { contentHtml: string }).contentHtml)).toEqual(['<p>one</p>', '<p>one, two, three</p>']);
		expect(mockUpdateContent.mock.calls[1][1]).toMatchObject({ expectedUpdatedAt: T1 });
		expect(back.result.current.hasDraft()).toBe(false);
	});

	it('a page left with nothing to save leaves nothing behind: the next visit starts from the page', async () => {
		const { wrapper } = setup();
		const page = pageOf('page-nothing-left');
		const running = deferred<IDocumentPage>();
		mockUpdateContent.mockReturnValueOnce(running.promise);

		const first = renderHook(() => useDocsAutosave(page), { wrapper });
		act(() => first.result.current.change('<p>mine</p>', null));
		act(() => void first.result.current.flushNow());
		first.unmount();
		await act(async () => {
			running.resolve({ ...page, updatedAt: T1, version: 2 });
		});
		await act(async () => {});

		const later = { ...page, updatedAt: T3, version: 4 } as IDocumentPage;
		const back = renderHook(() => useDocsAutosave(later), { wrapper });
		expect(back.result.current.state).toBe('idle');
		expect(back.result.current.restoredHtml).toBeNull();
		mockUpdateContent.mockResolvedValueOnce({ ...later, updatedAt: T5, version: 5 });
		act(() => back.result.current.change('<p>new</p>', null));
		await act(async () => {
			await back.result.current.flushNow();
		});
		expect(mockUpdateContent.mock.calls[1][1]).toMatchObject({ expectedUpdatedAt: T3 });
	});

	it('text typed while the page is read again keeps its clock and waits as a conflict, never saved over the update', async () => {
		const { wrapper } = setup();
		const page = pageOf('page-reload-typing');
		mockUpdateContent.mockRejectedValueOnce({ statusCode: 409 });

		const view = renderHook(() => useDocsAutosave(page), { wrapper });
		act(() => view.result.current.change('<p>mine</p>', null));
		await act(async () => {
			await view.result.current.flushNow();
		});
		expect(view.result.current.state).toBe('conflict');

		const fresh = deferred<IDocumentPage>();
		mockGetPage.mockReturnValueOnce(fresh.promise);
		let reloading: Promise<void> = Promise.resolve();
		act(() => {
			reloading = view.result.current.reload();
		});
		act(() => view.result.current.change('<p>typed meanwhile</p>', null));
		await act(async () => {
			fresh.resolve({ ...page, updatedAt: T5, version: 9 });
			await reloading;
		});
		expect(view.result.current.state).toBe('conflict');
		expect(view.result.current.hasDraft()).toBe(true);

		mockUpdateContent.mockRejectedValueOnce({ statusCode: 409 });
		await act(async () => {
			await view.result.current.flushNow();
		});
		expect(mockUpdateContent.mock.calls[1][1]).toMatchObject({ contentHtml: '<p>typed meanwhile</p>', expectedUpdatedAt: page.updatedAt });
	});

	it('closing the tab warns while any page of the tab holds unsaved text, not only the page on screen', async () => {
		const { wrapper } = setup();
		const page = pageOf('page-unload');
		mockUpdateContent.mockRejectedValueOnce(new Error('offline'));

		const first = renderHook(() => useDocsAutosave(page), { wrapper });
		act(() => first.result.current.change('<p>mine</p>', null));
		first.unmount();
		await waitFor(() => expect(mockUpdateContent).toHaveBeenCalledTimes(1));
		await act(async () => {});

		const other = renderHook(() => useDocsAutosave(pageOf('page-unload-other')), { wrapper });
		const leaving = new Event('beforeunload', { cancelable: true });
		window.dispatchEvent(leaving);
		expect(leaving.defaultPrevented).toBe(true);
		other.unmount();
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

describe('useEditorPageContent, a refreshed page', () => {
	type Props = { pageId: string | null; html: string; json: IDocumentNode | null; hasDraft: boolean };
	const render = (initialProps: Props) =>
		renderHook(({ pageId, html, json, hasDraft }: Props) => useEditorPageContent(pageId, html, json, hasDraft), { initialProps });
	const ONE: IDocumentNode = { type: 'doc', content: [{ type: 'paragraph' }] };
	const THEIRS: IDocumentNode = { type: 'doc', content: [{ type: 'unknownBlock' }] };

	it('reaches the editor while nothing typed here is unsaved', () => {
		const view = render({ pageId: 'p1', html: '<p>one</p>', json: ONE, hasDraft: false });
		view.rerender({ pageId: 'p1', html: '<p>theirs</p>', json: THEIRS, hasDraft: false });
		expect(view.result.current).toEqual({ html: '<p>theirs</p>', json: THEIRS });
	});

	it('waits while a draft is open, with no page JSON to check (an unsupported one would drop the draft), and arrives once it is saved or dropped', () => {
		const view = render({ pageId: 'p1', html: '<p>one</p>', json: ONE, hasDraft: true });
		view.rerender({ pageId: 'p1', html: '<p>theirs</p>', json: THEIRS, hasDraft: true });
		expect(view.result.current.html).toBe('<p>one</p>');
		expect(view.result.current.json).toBeNull();
		view.rerender({ pageId: 'p1', html: '<p>theirs</p>', json: THEIRS, hasDraft: false });
		expect(view.result.current).toEqual({ html: '<p>theirs</p>', json: THEIRS });
	});

	it('a draft taken back on a page whose JSON this editor cannot carry: the draft is shown, the JSON is not checked', () => {
		const view = render({ pageId: 'p1', html: '<p>theirs</p>', json: THEIRS, hasDraft: true });
		expect(view.result.current).toEqual({ html: '<p>theirs</p>', json: null });
		view.rerender({ pageId: 'p1', html: '<p>theirs</p>', json: THEIRS, hasDraft: false });
		expect(view.result.current.json).toBe(THEIRS);
	});

	it('never holds the content of another page', () => {
		const view = render({ pageId: 'p1', html: '<p>one</p>', json: ONE, hasDraft: true });
		view.rerender({ pageId: 'p2', html: '<p>two</p>', json: null, hasDraft: true });
		expect(view.result.current).toEqual({ html: '<p>two</p>', json: null });
		view.rerender({ pageId: 'p2', html: '<p>two, theirs</p>', json: THEIRS, hasDraft: true });
		expect(view.result.current).toEqual({ html: '<p>two</p>', json: null });
	});
});
