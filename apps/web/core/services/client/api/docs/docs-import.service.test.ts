import qs from 'qs';
import { DOCS_IMPORT_UPLOAD_TIMEOUT_MS, DOCS_PDF_DOWNLOAD_TIMEOUT_MS } from '@/core/lib/utils/docs-import';
import { EDocumentVisibility } from '@/core/types/interfaces/common/docs';
import { docsImportService } from './docs-import.service';

/** The query of a request URL. */
function queryOf(url: unknown): Record<string, unknown> {
	return qs.parse(String(url).split('?')[1] ?? '');
}

describe('docsImportService', () => {
	afterEach(() => jest.restoreAllMocks());

	it('probes the import and the PDF export on their routes', async () => {
		const get = jest.spyOn(docsImportService, 'get').mockResolvedValue({ data: { items: [], maxZipBytes: 10 } } as never);
		await expect(docsImportService.probeImport()).resolves.toEqual({ items: [], maxZipBytes: 10 });
		expect(String(get.mock.calls[0][0])).toMatch(/^\/plugins\/docs\/imports\?/);
		await docsImportService.probePdf();
		expect(get.mock.calls[1][0]).toBe('/plugins/docs/exports/pdf');
	});

	it('starts an import into a space: the file, the space and the team, with upload progress', async () => {
		const post = jest.spyOn(docsImportService, 'post').mockImplementation(async (_url, _body, config) => {
			config?.onUploadProgress?.({ loaded: 5, total: 10 } as never);
			return { data: { id: 'import-1' } } as never;
		});
		const progress: number[] = [];
		const file = new File(['zip'], 'vault.zip', { type: 'application/zip' });
		await docsImportService.startImport(file, { visibility: EDocumentVisibility.TEAM, organizationTeamId: 'team-1' }, (percent) => progress.push(percent));

		expect(post.mock.calls[0][0]).toBe('/plugins/docs/imports');
		const form = post.mock.calls[0][1] as FormData;
		expect((form.get('file') as File).name).toBe('vault.zip');
		expect(form.get('visibility')).toBe(EDocumentVisibility.TEAM);
		expect(form.get('organizationTeamId')).toBe('team-1');
		expect(form.has('parentId')).toBe(false);
		expect(progress).toEqual([50]);
		// A large zip on a slow connection outlasts the client's 60 s default.
		expect(post.mock.calls[0][2]).toMatchObject({ timeout: DOCS_IMPORT_UPLOAD_TIMEOUT_MS });
	});

	it('starts an import under a page without a space', async () => {
		const post = jest.spyOn(docsImportService, 'post').mockResolvedValue({ data: {} } as never);
		await docsImportService.startImport(new File(['zip'], 'x.zip'), { parentId: 'page-1', visibility: EDocumentVisibility.PRIVATE });
		const form = post.mock.calls[0][1] as FormData;
		expect(form.get('parentId')).toBe('page-1');
		expect(form.has('visibility')).toBe(false);
	});

	it('reads an import by its id', async () => {
		const get = jest.spyOn(docsImportService, 'get').mockResolvedValue({ data: { id: 'import 1' } } as never);
		await docsImportService.getImport('import 1');
		expect(String(get.mock.calls[0][0])).toMatch(/^\/plugins\/docs\/imports\/import%201\?/);
	});

	it('downloads a subtree PDF as a blob with its name', async () => {
		const blob = new Blob(['%PDF']);
		const get = jest.spyOn(docsImportService, 'get').mockResolvedValue({ data: blob, headers: { 'content-disposition': 'attachment; filename="a.pdf"' } } as never);
		await expect(docsImportService.downloadPdf('page-1', { subtree: true })).resolves.toEqual({ blob, disposition: 'attachment; filename="a.pdf"' });
		const [url, config] = get.mock.calls[0];
		expect(String(url)).toMatch(/^\/plugins\/docs\/documents\/page-1\/export\.pdf\?/);
		expect(queryOf(url)).toMatchObject({ subtree: 'true' });
		expect(queryOf(url).format).toBeUndefined();
		expect(config).toMatchObject({ responseType: 'blob', timeout: DOCS_PDF_DOWNLOAD_TIMEOUT_MS });
	});

	it('asks for a zip of PDFs only with the subtree', async () => {
		const get = jest.spyOn(docsImportService, 'get').mockResolvedValue({ data: new Blob([]), headers: {} } as never);
		await docsImportService.downloadPdf('page-1', { zip: true });
		expect(queryOf(get.mock.calls[0][0]).format).toBeUndefined();
		await docsImportService.downloadPdf('page-1', { subtree: true, zip: true });
		expect(queryOf(get.mock.calls[1][0])).toMatchObject({ subtree: 'true', format: 'zip' });
	});
});
