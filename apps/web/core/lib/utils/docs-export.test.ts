import { ApiErrorService } from '@/core/services/client/api-error.service';
import { EDocumentKind } from '@/core/types/interfaces/common/docs';
import { isInside, offersZipExport, zipExportFailureOf, zipExportFileName } from './docs-export';

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

	it('tells whether a page is in a folder by its parents, and stops on a loop', () => {
		const byId = new Map<string, { parentId: string | null }>([
			['folder', { parentId: null }],
			['sub', { parentId: 'folder' }],
			['page', { parentId: 'sub' }],
			['other', { parentId: null }],
			['loop-a', { parentId: 'loop-b' }],
			['loop-b', { parentId: 'loop-a' }]
		]);
		expect(isInside(byId, 'page', 'folder')).toBe(true);
		expect(isInside(byId, 'other', 'folder')).toBe(false);
		expect(isInside(byId, 'loop-a', 'folder')).toBe(false);
		expect(isInside(byId, 'unknown', 'folder')).toBe(false);
	});

	it("reads a 409 for a folder as a platform that exports pages only, anything else as a failure", () => {
		const conflict = new ApiErrorService('A Markdown export is of a page', 409, 'DOCS_NOT_A_PAGE');
		expect(zipExportFailureOf(conflict, EDocumentKind.FOLDER)).toBe('folder-unsupported');
		expect(zipExportFailureOf(conflict, EDocumentKind.PAGE)).toBe('failed');
		expect(zipExportFailureOf(new ApiErrorService('Server error', 500), EDocumentKind.FOLDER)).toBe('failed');
		expect(zipExportFailureOf(new Error('offline'), EDocumentKind.FOLDER)).toBe('failed');
	});
});
