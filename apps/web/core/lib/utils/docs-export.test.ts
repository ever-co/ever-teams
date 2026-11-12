import { ApiErrorService } from '@/core/services/client/api-error.service';
import { EDocumentKind } from '@/core/types/interfaces/common/docs';
import { offersZipExport, zipExportFailureOf, zipExportFileName } from './docs-export';

describe('the zip export of a page or a folder', () => {
	it('is offered for a folder always, for a page with sub-pages, and never for a file', () => {
		expect(offersZipExport({ kind: EDocumentKind.FOLDER }, false)).toBe(true);
		expect(offersZipExport({ kind: EDocumentKind.PAGE }, true)).toBe(true);
		expect(offersZipExport({ kind: EDocumentKind.PAGE }, false)).toBe(false);
		expect(offersZipExport({ kind: EDocumentKind.FILE }, true)).toBe(false);
	});

	it('names the zip after the title, or the untitled label', () => {
		expect(zipExportFileName({ name: 'Team handbook' }, 'Untitled')).toMatch(/\.zip$/);
		expect(zipExportFileName({ name: 'Team handbook' }, 'Untitled')).toContain('Team');
		expect(zipExportFileName({ name: '' }, 'Untitled')).toContain('Untitled');
	});

	it("reads a 409 for a folder as a platform that exports pages only, anything else as a failure", () => {
		const conflict = new ApiErrorService('A Markdown export is of a page', 409, 'DOCS_NOT_A_PAGE');
		expect(zipExportFailureOf(conflict, EDocumentKind.FOLDER)).toBe('folder-unsupported');
		expect(zipExportFailureOf(conflict, EDocumentKind.PAGE)).toBe('failed');
		expect(zipExportFailureOf(new ApiErrorService('Server error', 500), EDocumentKind.FOLDER)).toBe('failed');
		expect(zipExportFailureOf(new Error('offline'), EDocumentKind.FOLDER)).toBe('failed');
	});
});
