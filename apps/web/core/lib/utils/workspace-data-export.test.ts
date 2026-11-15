import {
	WORKSPACE_EXPORT_PERMISSION,
	canExportWorkspaceData,
	holdsWorkspaceExportPermission,
	isCompleteZipArchive,
	workspaceExportFileName
} from './workspace-data-export';
import { ERoleName } from '@/core/types/generics/enums/role';

/** The bytes of a ZIP archive: a local file header, some data, then the end of central directory record. */
function zipBytes({ comment = 0, truncatedBy = 0 }: { comment?: number; truncatedBy?: number } = {}): Uint8Array {
	const localHeader = [0x50, 0x4b, 0x03, 0x04];
	const data = new Array(200).fill(0x41);
	const endRecord = [0x50, 0x4b, 0x05, 0x06, ...new Array(16).fill(0), comment & 0xff, comment >> 8];
	const commentBytes = new Array(comment).fill(0x20);
	const bytes = [...localHeader, ...data, ...endRecord, ...commentBytes];
	return Uint8Array.from(bytes.slice(0, bytes.length - truncatedBy));
}

describe('workspace data export rules', () => {
	describe('who gets the export', () => {
		it('is the workspace owner holding the export permission', () => {
			expect(canExportWorkspaceData(ERoleName.SUPER_ADMIN, [WORKSPACE_EXPORT_PERMISSION, 'ALL_ORG_EDIT'])).toBe(
				true
			);
		});

		it('is not an admin of one organization, even with the permission, since the archive holds every organization', () => {
			expect(canExportWorkspaceData(ERoleName.ADMIN, [WORKSPACE_EXPORT_PERMISSION])).toBe(false);
		});

		it('is not the owner without the permission', () => {
			expect(canExportWorkspaceData(ERoleName.SUPER_ADMIN, ['ALL_ORG_EDIT'])).toBe(false);
		});

		it('is nobody while the role is unknown', () => {
			expect(canExportWorkspaceData(undefined, [WORKSPACE_EXPORT_PERMISSION])).toBe(false);
			expect(canExportWorkspaceData(null, [WORKSPACE_EXPORT_PERMISSION])).toBe(false);
		});

		it('lets the route follow the permission the API guards the export with', () => {
			expect(holdsWorkspaceExportPermission([WORKSPACE_EXPORT_PERMISSION])).toBe(true);
			expect(holdsWorkspaceExportPermission(['ALL_ORG_VIEW', 'EXPORT_VIEW'])).toBe(false);
			expect(holdsWorkspaceExportPermission([])).toBe(false);
		});
	});

	describe('the file name', () => {
		const day = new Date(2026, 10, 14, 23, 30);

		it('is the workspace name and the day of the export', () => {
			expect(workspaceExportFileName('Acme', day)).toBe('Acme-data-2026-11-14.zip');
		});

		it('keeps the day of the person exporting, not the UTC day', () => {
			expect(workspaceExportFileName('Acme', new Date(2026, 0, 2, 0, 15))).toBe('Acme-data-2026-01-02.zip');
		});

		it('turns spaces into dashes and drops what a file system refuses', () => {
			expect(workspaceExportFileName('  Acme  Labs / R&D: "Q4" <test>?*| ', day)).toBe(
				'Acme-Labs-R&D-Q4-test-data-2026-11-14.zip'
			);
		});

		it('turns control characters into a dash', () => {
			expect(workspaceExportFileName('Acme\u0001Labs\u007fEast\tWest', day)).toBe(
				'Acme-Labs-East-West-data-2026-11-14.zip'
			);
		});

		it('keeps letters of every alphabet', () => {
			expect(workspaceExportFileName('Équipe Kinshasa 東京', day)).toBe(
				'Équipe-Kinshasa-東京-data-2026-11-14.zip'
			);
		});

		it('shortens a very long name', () => {
			const name = workspaceExportFileName('x'.repeat(300), day);
			expect(name).toBe(`${'x'.repeat(80)}-data-2026-11-14.zip`);
		});

		it('drops the dots and dashes at both ends of the name, and keeps those inside it', () => {
			expect(workspaceExportFileName('..-Acme.Labs-Ops.-.', day)).toBe('Acme.Labs-Ops-data-2026-11-14.zip');
			expect(workspaceExportFileName('.-.-', day)).toBe('workspace-data-2026-11-14.zip');
			// Cut at 80 characters, the stem does not end on a dot either
			expect(workspaceExportFileName(`${'x'.repeat(79)}.yz`, day)).toBe(`${'x'.repeat(79)}-data-2026-11-14.zip`);
		});

		it('falls back to "workspace" when nothing of the name can be kept', () => {
			expect(workspaceExportFileName(' /:*? ', day)).toBe('workspace-data-2026-11-14.zip');
			expect(workspaceExportFileName('', day)).toBe('workspace-data-2026-11-14.zip');
		});

		it('never starts with a dot, so the file is not hidden', () => {
			expect(workspaceExportFileName('...acme', day)).toBe('acme-data-2026-11-14.zip');
		});
	});

	describe('a complete archive', () => {
		it('is a ZIP that ends with its end of central directory record', () => {
			expect(isCompleteZipArchive(zipBytes())).toBe(true);
		});

		it('allows the comment that may follow that record', () => {
			expect(isCompleteZipArchive(zipBytes({ comment: 40 }))).toBe(true);
		});

		it('is not an archive cut before its end, so a broken download never reaches the person', () => {
			expect(isCompleteZipArchive(zipBytes({ truncatedBy: 10 }))).toBe(false);
			expect(isCompleteZipArchive(zipBytes({ truncatedBy: 30 }))).toBe(false);
		});

		it('is not something else, such as an error page', () => {
			const page = new TextEncoder().encode('<!doctype html><title>Error</title>');
			expect(isCompleteZipArchive(page)).toBe(false);
		});

		it('is not an empty answer', () => {
			expect(isCompleteZipArchive(new Uint8Array(0))).toBe(false);
		});

		it('accepts an archive with no file at all, which is its end record alone', () => {
			const emptyArchive = Uint8Array.from([0x50, 0x4b, 0x05, 0x06, ...new Array(18).fill(0)]);
			expect(isCompleteZipArchive(emptyArchive)).toBe(true);
		});
	});
});
