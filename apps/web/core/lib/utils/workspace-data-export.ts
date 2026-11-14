import { ERoleName } from '@/core/types/generics/enums/role';

/** The permission Gauzy guards `GET /export` with: the archive of every table of the workspace. */
export const WORKSPACE_EXPORT_PERMISSION = 'EXPORT_ADD';

/** Longest part of the file name taken from the workspace's name. */
const MAX_FILE_NAME_STEM = 80;

/** What no file system takes in a name (control characters aside), and the spaces between words. */
const UNSAFE_FILE_NAME_CHARACTERS = /[\\/:*?"<>|]+/g;
const SPACES = /\s+/g;
const REPEATED_DASHES = /-{2,}/g;

/** Signatures of a ZIP archive, little-endian as they are written. */
const LOCAL_FILE_HEADER = [0x50, 0x4b, 0x03, 0x04];
const END_OF_CENTRAL_DIRECTORY = [0x50, 0x4b, 0x05, 0x06];
/** The end record is 22 bytes, followed by a comment of at most 65,535 bytes. */
const END_RECORD_LENGTH = 22;
const MAX_COMMENT_LENGTH = 0xffff;

/** Whether the route may hand the export on: the permission the API asks for it. */
export function holdsWorkspaceExportPermission(permissions: ReadonlyArray<string>): boolean {
	return permissions.includes(WORKSPACE_EXPORT_PERMISSION);
}

/**
 * Whether the page offers the export. The archive holds every organization of the workspace, so the workspace owner
 * alone gets it, and only with the permission the API asks for.
 */
export function canExportWorkspaceData(
	roleName: string | null | undefined,
	permissions: ReadonlyArray<string>
): boolean {
	const isWorkspaceOwner = roleName === ERoleName.SUPER_ADMIN;
	return isWorkspaceOwner && holdsWorkspaceExportPermission(permissions);
}

function twoDigits(value: number): string {
	return String(value).padStart(2, '0');
}

/** The day of `date` where the person is, as YYYY-MM-DD. */
function localDayOf(date: Date): string {
	const year = date.getFullYear();
	const month = twoDigits(date.getMonth() + 1);
	const day = twoDigits(date.getDate());
	return `${year}-${month}-${day}`;
}

/** A control character (a tab, a line break...) becomes a space; any other character stays. */
function printableCharacterOf(character: string): string {
	const code = character.codePointAt(0) ?? 0;
	const isControlCharacter = code < 0x20 || code === 0x7f;
	if (isControlCharacter) {
		return ' ';
	}
	return character;
}

function isDotOrDash(character: string | undefined): boolean {
	return character === '.' || character === '-';
}

/** The text without the dots and dashes at its two ends, read once from each end (no backtracking pattern). */
function withoutEdgeDotsAndDashes(text: string): string {
	let start = 0;
	let end = text.length;
	while (start < end && isDotOrDash(text[start])) {
		start += 1;
	}
	while (end > start && isDotOrDash(text[end - 1])) {
		end -= 1;
	}
	return text.slice(start, end);
}

/** The workspace's name as a file name stem: what file systems refuse dropped, words joined by dashes. */
function fileNameStemOf(workspaceName: string): string {
	const printable = Array.from(workspaceName).map(printableCharacterOf).join('');
	const safe = printable.replace(UNSAFE_FILE_NAME_CHARACTERS, ' ').trim().replace(SPACES, '-');
	const joined = withoutEdgeDotsAndDashes(safe.replace(REPEATED_DASHES, '-'));
	const shortened = Array.from(joined).slice(0, MAX_FILE_NAME_STEM).join('');
	return withoutEdgeDotsAndDashes(shortened) || 'workspace';
}

/** The name of the downloaded archive: the workspace and the day of the export, e.g. `Acme-data-2026-11-14.zip`. */
export function workspaceExportFileName(workspaceName: string, date: Date): string {
	return `${fileNameStemOf(workspaceName)}-data-${localDayOf(date)}.zip`;
}

function startsWithAt(bytes: Uint8Array, offset: number, signature: ReadonlyArray<number>): boolean {
	return signature.every((byte, index) => bytes[offset + index] === byte);
}

/**
 * Whether `bytes` are a whole ZIP archive: they open as one, and its end of central directory record, which closes
 * every archive, is there. An answer cut on its way lacks that record, and so does anything that is not an archive.
 */
export function isCompleteZipArchive(bytes: Uint8Array): boolean {
	const opensAsArchive = startsWithAt(bytes, 0, LOCAL_FILE_HEADER);
	const isEmptyArchive = startsWithAt(bytes, 0, END_OF_CENTRAL_DIRECTORY);
	if (!opensAsArchive && !isEmptyArchive) {
		return false;
	}
	const lastRecordStart = bytes.length - END_RECORD_LENGTH;
	const firstRecordStart = Math.max(0, lastRecordStart - MAX_COMMENT_LENGTH);
	for (let offset = lastRecordStart; offset >= firstRecordStart; offset--) {
		const isEndRecord = startsWithAt(bytes, offset, END_OF_CENTRAL_DIRECTORY);
		if (!isEndRecord) {
			continue;
		}
		const commentLength = bytes[offset + 20] | (bytes[offset + 21] << 8);
		const endsWithItsComment = offset + END_RECORD_LENGTH + commentLength === bytes.length;
		if (endsWithItsComment) {
			return true;
		}
	}
	return false;
}
