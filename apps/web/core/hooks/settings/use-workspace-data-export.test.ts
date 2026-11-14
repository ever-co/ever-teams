/** @jest-environment jsdom */

import { Blob as NodeBlob } from 'node:buffer';
import { createElement, type ReactNode } from 'react';
import { Provider, createStore } from 'jotai';
import { act, renderHook, waitFor } from '@testing-library/react';

const mockDownloadArchive = jest.fn();
const mockDownloadBlob = jest.fn();
const mockToastSuccess = jest.fn();
let mockRoleName: string | undefined = 'SUPER_ADMIN';
let mockPermissions: string[] = ['EXPORT_ADD'];

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { success: (...args: unknown[]) => mockToastSuccess(...args) } }));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { id: 'user-a', role: { name: mockRoleName } } })
}));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: mockPermissions, isLoading: false })
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => 'tenant-a',
	getAccessTokenCookie: () => 'token-a'
}));
jest.mock('@/core/services/client/api/export/workspace-export.service', () => ({
	workspaceExportService: { downloadWorkspaceArchive: (...args: unknown[]) => mockDownloadArchive(...args) }
}));
jest.mock('@/core/lib/utils/dashboard-export', () => ({
	downloadBlob: (...args: unknown[]) => mockDownloadBlob(...args)
}));

import { useWorkspaceDataExport } from './use-workspace-data-export';

/**
 * A whole ZIP archive, or the same cut before its end, as the browser receives it: Node's Blob, since jsdom's has no
 * arrayBuffer(). `filler` makes it larger than the part the hook reads at each end.
 */
function archiveOf({ cut = false, filler = 64 } = {}): Blob {
	const start = [0x50, 0x4b, 0x03, 0x04];
	const endRecord = [0x50, 0x4b, 0x05, 0x06, ...new Array(18).fill(0)];
	const bytes = Uint8Array.from([...start, ...new Array(filler).fill(0x41), ...endRecord]);
	const kept = cut ? bytes.slice(0, bytes.length - 12) : bytes;
	return new NodeBlob([kept], { type: 'application/zip' }) as unknown as Blob;
}

function deferred<T>() {
	let resolve: (value: T) => void = () => undefined;
	const promise = new Promise<T>((settle) => {
		resolve = settle;
	});
	return { promise, resolve };
}

const workspace = { workspaceName: 'Acme Labs', organizationId: 'organization-a' };

type ExportOptions = Parameters<typeof useWorkspaceDataExport>[0];

/** The hook in a store of its own, or in `store` to stand for the same tab rendering the page again. */
function renderExport(options: ExportOptions, store = createStore()) {
	const wrapper = ({ children }: { children: ReactNode }) => createElement(Provider, { store }, children);
	return renderHook(() => useWorkspaceDataExport(options), { wrapper });
}

describe('useWorkspaceDataExport', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockRoleName = 'SUPER_ADMIN';
		mockPermissions = ['EXPORT_ADD'];
	});

	it('offers the export to the workspace owner holding the permission only', () => {
		expect(renderExport(workspace).result.current.canExport).toBe(true);

		mockRoleName = 'ADMIN';
		expect(renderExport(workspace).result.current.canExport).toBe(false);

		mockRoleName = 'SUPER_ADMIN';
		mockPermissions = ['ALL_ORG_EDIT'];
		expect(renderExport(workspace).result.current.canExport).toBe(false);
	});

	it('saves the whole archive under the workspace name and the day, and says so', async () => {
		const archive = archiveOf();
		mockDownloadArchive.mockResolvedValue(archive);
		const { result } = renderExport(workspace);

		await act(() => result.current.exportAll());

		expect(mockDownloadArchive).toHaveBeenCalledWith({
			tenantId: 'tenant-a',
			accessToken: 'token-a',
			organizationId: 'organization-a'
		});
		const [savedBlob, fileName] = mockDownloadBlob.mock.calls[0] as [Blob, string];
		expect(savedBlob).toBe(archive);
		expect(fileName).toMatch(/^Acme-Labs-data-\d{4}-\d{2}-\d{2}\.zip$/);
		expect(mockToastSuccess).toHaveBeenCalledWith('settings.workspace.EXPORT_DONE', { description: fileName });
		expect(result.current.isExporting).toBe(false);
		expect(result.current.isFailed).toBe(false);
	});

	it('says it is working until the archive arrives, and starts one export at a time', async () => {
		const answer = deferred<Blob>();
		mockDownloadArchive.mockReturnValue(answer.promise);
		const { result } = renderExport(workspace);

		let first: Promise<void> = Promise.resolve();
		act(() => {
			first = result.current.exportAll();
		});
		await waitFor(() => expect(result.current.isExporting).toBe(true));
		await act(() => result.current.exportAll());
		expect(mockDownloadArchive).toHaveBeenCalledTimes(1);

		await act(async () => {
			answer.resolve(archiveOf());
			await first;
		});
		expect(result.current.isExporting).toBe(false);
		expect(mockDownloadBlob).toHaveBeenCalledTimes(1);
	});

	it('shows a page opened again while the archive is prepared that it is running, and starts no second one', async () => {
		const answer = deferred<Blob>();
		mockDownloadArchive.mockReturnValue(answer.promise);
		const tab = createStore();
		const first = renderExport(workspace, tab);

		let running: Promise<void> = Promise.resolve();
		act(() => {
			running = first.result.current.exportAll();
		});
		await waitFor(() => expect(first.result.current.isExporting).toBe(true));
		first.unmount();

		const again = renderExport(workspace, tab);
		expect(again.result.current.isExporting).toBe(true);
		await act(() => again.result.current.exportAll());
		expect(mockDownloadArchive).toHaveBeenCalledTimes(1);

		await act(async () => {
			answer.resolve(archiveOf());
			await running;
		});
		expect(again.result.current.isExporting).toBe(false);
		expect(mockDownloadBlob).toHaveBeenCalledTimes(1);
	});

	it('says the export failed, and saves nothing, when the request fails', async () => {
		mockDownloadArchive.mockRejectedValue(Object.assign(new Error('Network Error'), { statusCode: 0 }));
		const { result } = renderExport(workspace);

		await act(() => result.current.exportAll());

		expect(result.current.isFailed).toBe(true);
		expect(result.current.isExporting).toBe(false);
		expect(mockDownloadBlob).not.toHaveBeenCalled();
	});

	it('reads only the ends of a large archive, and saves it when it is whole', async () => {
		const archive = archiveOf({ filler: 200_000 });
		const readWhole = jest.spyOn(archive, 'arrayBuffer');
		const sliced = jest.spyOn(archive, 'slice');
		mockDownloadArchive.mockResolvedValue(archive);
		const { result } = renderExport(workspace);

		await act(() => result.current.exportAll());

		expect(readWhole).not.toHaveBeenCalled();
		expect(sliced.mock.calls).toEqual([[0, 4], [archive.size - (22 + 0xffff)]]);
		expect(mockDownloadBlob.mock.calls[0][0]).toBe(archive);
		expect(result.current.isFailed).toBe(false);
	});

	it('never saves a large archive cut on its way', async () => {
		mockDownloadArchive.mockResolvedValue(archiveOf({ filler: 200_000, cut: true }));
		const { result } = renderExport(workspace);

		await act(() => result.current.exportAll());

		expect(result.current.isFailed).toBe(true);
		expect(mockDownloadBlob).not.toHaveBeenCalled();
	});

	it('never saves an archive cut on its way: it says the export failed instead', async () => {
		mockDownloadArchive.mockResolvedValue(archiveOf({ cut: true }));
		const { result } = renderExport(workspace);

		await act(() => result.current.exportAll());

		expect(result.current.isFailed).toBe(true);
		expect(mockDownloadBlob).not.toHaveBeenCalled();
		expect(mockToastSuccess).not.toHaveBeenCalled();
	});

	it('clears the failure once a new try goes through', async () => {
		mockDownloadArchive.mockRejectedValueOnce(new Error('Gateway Timeout')).mockResolvedValueOnce(archiveOf());
		const { result } = renderExport(workspace);

		await act(() => result.current.exportAll());
		expect(result.current.isFailed).toBe(true);

		await act(() => result.current.exportAll());
		expect(result.current.isFailed).toBe(false);
		expect(mockDownloadBlob).toHaveBeenCalledTimes(1);
	});

	it('does nothing before the organization is known', async () => {
		const { result } = renderHook(() =>
			useWorkspaceDataExport({ workspaceName: 'Acme', organizationId: undefined })
		);

		await act(() => result.current.exportAll());

		expect(mockDownloadArchive).not.toHaveBeenCalled();
		expect(result.current.isFailed).toBe(false);
	});
});
