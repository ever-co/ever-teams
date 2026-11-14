import { WORKSPACE_EXPORT_TIMEOUT_MS, workspaceExportService } from './workspace-export.service';

describe('WorkspaceExportService.downloadWorkspaceArchive', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	const workspace = { tenantId: 'tenant-a', accessToken: 'token-a', organizationId: 'organization-a' };

	it("asks for the workspace's archive as a file, with the token of the workspace the page shows", async () => {
		const archive = new Blob(['PK']);
		const get = jest.spyOn(workspaceExportService, 'get').mockResolvedValue({ data: archive } as never);

		await expect(workspaceExportService.downloadWorkspaceArchive(workspace)).resolves.toBe(archive);

		expect(get).toHaveBeenCalledWith(
			'/export',
			expect.objectContaining({
				params: { organizationId: 'organization-a' },
				responseType: 'blob',
				tenantId: 'tenant-a',
				pinnedAuthorization: true,
				headers: { Authorization: 'Bearer token-a' }
			})
		);
	});

	it('gives the archive, which Gauzy builds before it sends anything, much longer than a usual request', async () => {
		const get = jest.spyOn(workspaceExportService, 'get').mockResolvedValue({ data: new Blob() } as never);

		await workspaceExportService.downloadWorkspaceArchive(workspace);

		expect(get).toHaveBeenCalledWith('/export', expect.objectContaining({ timeout: WORKSPACE_EXPORT_TIMEOUT_MS }));
		expect(WORKSPACE_EXPORT_TIMEOUT_MS).toBeGreaterThanOrEqual(10 * 60_000);
	});

	it('lets the page stop waiting', async () => {
		const get = jest.spyOn(workspaceExportService, 'get').mockResolvedValue({ data: new Blob() } as never);
		const controller = new AbortController();

		await workspaceExportService.downloadWorkspaceArchive(workspace, controller.signal);

		expect(get).toHaveBeenCalledWith('/export', expect.objectContaining({ signal: controller.signal }));
	});

	it("rejects with Gauzy's refusal, so the page can say the export failed", async () => {
		const refusal = Object.assign(new Error('Forbidden resource'), { statusCode: 403 });
		jest.spyOn(workspaceExportService, 'get').mockRejectedValue(refusal);

		await expect(workspaceExportService.downloadWorkspaceArchive(workspace)).rejects.toBe(refusal);
	});
});
