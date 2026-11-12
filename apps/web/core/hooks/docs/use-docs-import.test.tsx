/** @jest-environment jsdom */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { IDocumentImport } from '@/core/types/interfaces/common/docs-import';

const mockService = { startImport: jest.fn(), getImport: jest.fn(), probeImport: jest.fn(), probePdf: jest.fn(), downloadPdf: jest.fn() };

jest.mock('@/core/services/client/api/docs', () => ({
	get docsImportService() {
		return mockService;
	}
}));
let mockScope = { tenantId: 'tenant-1', organizationId: 'org-1', userId: 'user-1', employeeId: null as string | null };
jest.mock('./use-docs-scope', () => ({ useDocsScope: () => mockScope }));
// An answer of the platform with its status, as the client's errors carry it.
jest.mock('@/core/services/client/api-error.service', () => ({
	ApiErrorService: { isApiError: (error: unknown) => Boolean((error as { statusCode?: number })?.statusCode) }
}));
jest.mock('@/core/lib/utils/docs-import', () => ({ ...jest.requireActual('@/core/lib/utils/docs-import'), DOCS_IMPORT_POLL_MS: 20 }));

import { useDocsImportRun } from './use-docs-import';

const refusal = (statusCode: number) => Object.assign(new Error(`HTTP ${statusCode}`), { statusCode, isEndpointUnavailable: () => false });

const importOf = (status: IDocumentImport['status'], processed = 0): IDocumentImport => ({
	id: 'import-1',
	status,
	phase: status === 'COMPLETED' ? 'DONE' : 'TREE',
	fileName: 'vault.zip',
	totalItems: 10,
	processedItems: processed,
	importedCount: status === 'COMPLETED' ? 3 : 0,
	skippedCount: 0,
	failedCount: 0
});

function wrapper() {
	const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0, gcTime: 0 } } });
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
	};
}

const zip = () => new File(['zip'], 'vault.zip', { type: 'application/zip' });

describe('useDocsImportRun', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		mockScope = { tenantId: 'tenant-1', organizationId: 'org-1', userId: 'user-1', employeeId: null };
	});

	it('follows the import to its end and tells the page once, the dialog open or not', async () => {
		mockService.startImport.mockResolvedValue(importOf('QUEUED'));
		mockService.getImport.mockResolvedValueOnce(importOf('RUNNING', 4)).mockResolvedValue(importOf('COMPLETED', 10));
		const onFinished = jest.fn();
		const { result } = renderHook(() => useDocsImportRun(onFinished), { wrapper: wrapper() });

		await act(() => result.current.start(zip(), { parentId: 'page-1' }));
		expect(result.current.inProgress).toBe(true);
		await waitFor(() => expect(result.current.step).toBe('done'));

		expect(result.current.inProgress).toBe(false);
		expect(result.current.current?.importedCount).toBe(3);
		await waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1));
		// Later renders of the finished import do not tell it again.
		await new Promise((resolve) => setTimeout(resolve, 80));
		expect(onFinished).toHaveBeenCalledTimes(1);
	});

	it('says when the progress cannot be read, and reads it again without a new upload', async () => {
		mockService.startImport.mockResolvedValue(importOf('RUNNING', 1));
		mockService.getImport.mockRejectedValue(refusal(503));
		const onFinished = jest.fn();
		const { result } = renderHook(() => useDocsImportRun(onFinished), { wrapper: wrapper() });

		await act(() => result.current.start(zip(), { parentId: 'page-1' }));
		await waitFor(() => expect(result.current.trackingError).toBe(true));
		expect(result.current.step).toBe('running');

		mockService.getImport.mockResolvedValue(importOf('COMPLETED', 10));
		act(() => result.current.retryRead());
		await waitFor(() => expect(result.current.step).toBe('done'));
		expect(result.current.trackingError).toBe(false);
		expect(mockService.startImport).toHaveBeenCalledTimes(1);
		await waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1));
	});

	it('stops reading an import the platform no longer answers for', async () => {
		mockService.startImport.mockResolvedValue(importOf('RUNNING', 1));
		mockService.getImport.mockRejectedValue(refusal(404));
		const { result } = renderHook(() => useDocsImportRun(), { wrapper: wrapper() });

		await act(() => result.current.start(zip(), { parentId: 'page-1' }));
		await waitFor(() => expect(result.current.trackingError).toBe(true));
		const reads = mockService.getImport.mock.calls.length;
		// No retry and no polling after a refusal for good.
		await new Promise((resolve) => setTimeout(resolve, 120));
		expect(mockService.getImport.mock.calls).toHaveLength(reads);
		expect(reads).toBe(1);
		// Nothing runs here any more: closing the dialog puts the run away.
		expect(result.current.inProgress).toBe(false);
	});

	it('puts the run away when the organization changes, and drops an upload that answers after', async () => {
		let answer: (value: IDocumentImport) => void = () => undefined;
		mockService.startImport.mockImplementation(() => new Promise<IDocumentImport>((resolve) => (answer = resolve)));
		const { result, rerender } = renderHook(() => useDocsImportRun(), { wrapper: wrapper() });

		let upload: Promise<void> = Promise.resolve();
		act(() => {
			upload = result.current.start(zip(), { parentId: 'page-1' });
		});
		expect(result.current.step).toBe('uploading');

		mockScope = { ...mockScope, organizationId: 'org-2' };
		rerender();
		expect(result.current.step).toBe('pick');

		await act(async () => {
			answer(importOf('RUNNING', 1));
			await upload;
		});
		expect(result.current).toMatchObject({ step: 'pick', current: null, inProgress: false });
		expect(mockService.getImport).not.toHaveBeenCalled();
	});

	it('lets an older upload that answers late change nothing of a newer run', async () => {
		const answers: Array<(value: IDocumentImport) => void> = [];
		mockService.startImport.mockImplementation(() => new Promise<IDocumentImport>((resolve) => answers.push(resolve)));
		mockService.getImport.mockResolvedValue({ ...importOf('RUNNING', 2), id: 'import-b' });
		const { result, rerender } = renderHook(() => useDocsImportRun(), { wrapper: wrapper() });

		let first: Promise<void> = Promise.resolve();
		act(() => {
			first = result.current.start(zip(), { parentId: 'page-1' });
		});
		mockScope = { ...mockScope, organizationId: 'org-2' };
		rerender();
		let second: Promise<void> = Promise.resolve();
		act(() => {
			second = result.current.start(zip(), { parentId: 'page-2' });
		});
		await act(async () => {
			answers[1]({ ...importOf('RUNNING', 1), id: 'import-b' });
			await second;
		});
		expect(result.current.step).toBe('running');

		await act(async () => {
			answers[0]({ ...importOf('RUNNING', 1), id: 'import-a' });
			await first;
		});
		expect(result.current.step).toBe('running');
		expect(result.current.current?.id).toBe('import-b');
	});

	it('answers the code of a refused zip and goes back to the picker', async () => {
		mockService.startImport.mockRejectedValue(Object.assign(refusal(400), { errorCode: 'DOCS_IMPORT_SYMLINK' }));
		const { result } = renderHook(() => useDocsImportRun(), { wrapper: wrapper() });

		await act(() => result.current.start(zip(), { parentId: 'page-1' }));
		expect(result.current).toMatchObject({ step: 'pick', error: 'DOCS_IMPORT_SYMLINK', inProgress: false });
	});
});
