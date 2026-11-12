import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EDocumentKind } from '@/core/types/interfaces/common/docs';
import type { IDocumentImport } from '@/core/types/interfaces/common/docs-import';
import {
	DOCS_IMPORT_MESSAGE_KEYS,
	errorKeyOf,
	fileNameFromDisposition,
	formatLimit,
	importProgressPercent,
	importReportGroups,
	isImportFinished,
	isZipFile,
	phaseKeyOf,
	reasonKeyOf
} from './docs-import';
import { passedImportFieldsOf } from './docs-import-fields';

const LOCALES = join(__dirname, '../../../locales');

/** The value of a dotted key in a locale file. */
function valueOf(messages: Record<string, unknown>, key: string): unknown {
	return key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), messages);
}

describe('docs-import messages', () => {
	const locales = readdirSync(LOCALES).filter((name) => name.endsWith('.json'));
	const used = [
		...DOCS_IMPORT_MESSAGE_KEYS,
		'docs.IMPORT.BUTTON',
		'docs.IMPORT.HERE',
		'docs.IMPORT.TITLE',
		'docs.IMPORT.INTRO',
		'docs.IMPORT.CHOOSE_FILE',
		'docs.IMPORT.NO_FILE',
		'docs.IMPORT.TARGET',
		'docs.IMPORT.UNDER',
		'docs.IMPORT.START',
		'docs.IMPORT.UPLOADING',
		'docs.IMPORT.PROGRESS',
		'docs.IMPORT.BACKGROUND_HINT',
		'docs.IMPORT.SUMMARY',
		'docs.IMPORT.UNRESOLVED',
		'docs.IMPORT.PAGES',
		'docs.IMPORT.MORE',
		'docs.IMPORT.NOT_IMPORTED',
		'docs.IMPORT.TRUNCATED',
		'docs.EXPORT_PDF',
		'docs.EXPORT_PDF_WITH_SUB_PAGES',
		'docs.PDF_ERROR',
		'docs.PDF_TOO_MANY_PAGES'
	];

	it('are in all 13 languages, with the same placeholders as English', () => {
		expect(locales).toHaveLength(13);
		const english = JSON.parse(readFileSync(join(LOCALES, 'en.json'), 'utf8'));
		const placeholders = (text: unknown) => [...String(text).matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
		for (const locale of locales) {
			const messages = JSON.parse(readFileSync(join(LOCALES, locale), 'utf8'));
			for (const key of used) {
				const value = valueOf(messages, key);
				expect({ locale, key, type: typeof value }).toEqual({ locale, key, type: 'string' });
				expect({ locale, key, placeholders: placeholders(value) }).toEqual({ locale, key, placeholders: placeholders(valueOf(english, key)) });
			}
		}
	});

	it('maps reasons, codes and phases, with a generic message for the unknown', () => {
		expect(reasonKeyOf('QUOTA_EXCEEDED')).toBe('docs.IMPORT.REASON.QUOTA_EXCEEDED');
		expect(reasonKeyOf('NEW_REASON')).toBe('docs.IMPORT.REASON.OTHER');
		expect(errorKeyOf('DOCS_IMPORT_SYMLINK')).toBe('docs.IMPORT.ERROR.SYMLINK');
		expect(errorKeyOf(undefined)).toBe('docs.IMPORT.ERROR.FAILED');
		expect(phaseKeyOf('CONTENT')).toBe('docs.IMPORT.PHASE.CONTENT');
		expect(phaseKeyOf(null)).toBe('docs.IMPORT.PHASE.QUEUED');
	});
});

describe('docs-import helpers', () => {
	it('reads progress and the end of an import', () => {
		expect(importProgressPercent({ status: 'RUNNING', processedItems: 3, totalItems: 12 })).toBe(25);
		expect(importProgressPercent({ status: 'RUNNING', processedItems: 12, totalItems: 12 })).toBe(99);
		expect(importProgressPercent({ status: 'COMPLETED', processedItems: 0, totalItems: 0 })).toBe(100);
		expect(importProgressPercent(null)).toBe(0);
		expect(isImportFinished({ status: 'FAILED' })).toBe(true);
		expect(isImportFinished({ status: 'QUEUED' })).toBe(false);
	});

	it('groups the report: the pages to open, then what was not imported, failures first', () => {
		const value = {
			report: {
				items: [
					{ path: 'V/a.exe', kind: EDocumentKind.FILE, status: 'SKIPPED', reason: 'UNSUPPORTED_TYPE' },
					{ path: 'V/Home.md', kind: EDocumentKind.PAGE, status: 'IMPORTED', documentId: 'p1', unresolvedLinks: 2 },
					{ path: 'V', kind: EDocumentKind.FOLDER, status: 'IMPORTED', documentId: 'f1' },
					{ path: 'V/Big.md', kind: EDocumentKind.PAGE, status: 'FAILED', documentId: 'p2', reason: 'TOO_LARGE' }
				]
			}
		} as Pick<IDocumentImport, 'report'>;
		const groups = importReportGroups(value);
		expect(groups.pages.map((item) => item.documentId)).toEqual(['p1']);
		expect(groups.notImported.map((item) => item.path)).toEqual(['V/Big.md', 'V/a.exe']);
		expect(groups.unresolvedLinks).toBe(2);
	});

	it('recognises a zip, names a download, formats a limit', () => {
		expect(isZipFile({ name: 'vault.zip', type: '' })).toBe(true);
		expect(isZipFile({ name: 'x', type: 'application/x-zip-compressed' })).toBe(true);
		expect(isZipFile({ name: 'notes.md', type: 'text/markdown' })).toBe(false);
		expect(fileNameFromDisposition(`attachment; filename="plan.pdf"; filename*=UTF-8''pl%C3%A1n.pdf`, 'x')).toBe('plán.pdf');
		expect(fileNameFromDisposition('attachment; filename="plan.pdf"', 'x')).toBe('plan.pdf');
		expect(fileNameFromDisposition(null, 'page.pdf')).toBe('page.pdf');
		expect(formatLimit(104857600)).toBe('100 MB');
		expect(formatLimit(512)).toBe('512 B');
	});
});

describe('passedImportFieldsOf', () => {
	const form = (fields: Record<string, string>) => {
		const value = new FormData();
		for (const [name, text] of Object.entries(fields)) value.append(name, text);
		return value;
	};
	const PARENT = '11111111-2222-4333-8444-555555555555';
	const TEAM = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

	it('passes a parent alone (the parent decides the space)', () => {
		expect(passedImportFieldsOf(form({ parentId: PARENT, visibility: 'PRIVATE', tenantId: 'x' }))).toEqual([['parentId', PARENT]]);
	});

	it('passes a space, and a team only with a team space', () => {
		expect(passedImportFieldsOf(form({ visibility: 'TEAM', organizationTeamId: TEAM }))).toEqual([
			['visibility', 'TEAM'],
			['organizationTeamId', TEAM]
		]);
		expect(passedImportFieldsOf(form({ visibility: 'ORGANIZATION', organizationTeamId: TEAM }))).toEqual([['visibility', 'ORGANIZATION']]);
	});

	it('drops what is not one of the fields, or not of their shape', () => {
		expect(passedImportFieldsOf(form({ parentId: 'not-a-uuid', visibility: 'PUBLIC', organizationId: 'other', source: 'IMPORT' }))).toEqual([]);
		expect(passedImportFieldsOf(null)).toEqual([]);
	});
});
