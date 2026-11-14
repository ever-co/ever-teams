import {
	headerWordsOf,
	timeImportTableOf,
	type TimeImportRecord,
	type TimeImportSheetProblem,
	type TimeImportTable
} from './time-import-sheet';
import { zipEntriesOf, type ZipProblem } from './workspace-import-zip';

/** What one dropped file may weigh: an archive of a team's export, or one of its files. */
export const WORKSPACE_IMPORT_MAX_FILE_BYTES = 10 * 1024 * 1024;

/** What a file of the export holds, told by its name or, failing that, by its columns. */
export type WorkspaceFileKind = 'entries' | 'clients' | 'projects' | 'tags';

export interface WorkspaceTable {
	/** The file's name, or `archive.zip / file.csv` for a file of an archive. */
	fileName: string;
	kind: WorkspaceFileKind;
	table: TimeImportTable;
}

export type WorkspaceFileProblem =
	| { code: 'notSupported'; fileName: string }
	| { code: 'tooLarge'; fileName: string }
	| { code: 'notText'; fileName: string }
	| { code: 'zip'; fileName: string; problem: ZipProblem }
	| { code: 'json'; fileName: string }
	| { code: 'csv'; fileName: string; problem: TimeImportSheetProblem }
	| { code: 'unknownContent'; fileName: string }
	| { code: 'entriesColumnsDiffer'; fileName: string }
	| { code: 'repeatedKind'; fileName: string; kind: WorkspaceFileKind };

export interface WorkspaceFiles {
	clients: WorkspaceTable | null;
	projects: WorkspaceTable | null;
	tags: WorkspaceTable | null;
	/** Every file of entries with the same columns, one after the other, under the first file's name. */
	entries: WorkspaceTable | null;
	/** The files read, in the order they came, for the list the person sees. */
	read: WorkspaceTable[];
	problems: WorkspaceFileProblem[];
}

export interface WorkspacePickedFile {
	name: string;
	size: number;
	arrayBuffer: () => Promise<ArrayBuffer>;
}

/** Header words that say a column names a client, a project's colour, its billable default or labels. */
export const CLIENT_HEADERS = ['client', 'client name', 'customer', 'customer name', 'company'];
export const NAME_HEADERS = ['name'];
export const COLOR_HEADERS = ['color', 'colour', 'project color', 'project colour', 'hex color'];
export const BILLABLE_HEADERS = ['billable', 'is billable', 'billable by default', 'default billable'];
export const TAG_HEADERS = ['tags', 'tag', 'labels', 'label'];
const PROJECT_HEADERS = ['project', 'project name'];
const TIME_HEADER_WORDS = ['start', 'date', 'duration', 'begin'];

const KIND_WORDS: ReadonlyArray<[WorkspaceFileKind, ReadonlyArray<string>]> = [
	['clients', ['client', 'clients', 'customer', 'customers']],
	['projects', ['project', 'projects']],
	['tags', ['tag', 'tags', 'label', 'labels']],
	['entries', ['time', 'entries', 'entry', 'report', 'detailed', 'timesheet', 'timesheets', 'logs']]
];

/** The position of the first column whose header reads as one of `candidates`, or null. */
export function columnIndexOf(headers: ReadonlyArray<string>, candidates: ReadonlyArray<string>): number | null {
	const index = headers.findIndex((header) => candidates.includes(headerWordsOf(header)));
	if (index === -1) {
		return null;
	}
	return index;
}

function baseNameOf(fileName: string): string {
	const parts = fileName.split('/');
	const last = parts[parts.length - 1] ?? fileName;
	return last.replace(/\.[^.]+$/u, '');
}

function extensionOf(fileName: string): string {
	const match = /\.([^./]+)$/u.exec(fileName);
	return match?.[1]?.toLowerCase() ?? '';
}

function holdsTimes(headers: ReadonlyArray<string>): boolean {
	return headers.some((header) => {
		const words = headerWordsOf(header).split(' ');
		return words.some((word) => TIME_HEADER_WORDS.includes(word));
	});
}

/** A file's kind from the words of its name, else from its columns: times make entries, a name column a list. */
export function workspaceFileKindOf(fileName: string, headers: ReadonlyArray<string>): WorkspaceFileKind | null {
	const nameWords = headerWordsOf(baseNameOf(fileName)).split(' ');
	const kindsByName = KIND_WORDS.filter(([, words]) => nameWords.some((word) => words.includes(word))).map(
		([kind]) => kind
	);
	const holdsEntries = holdsTimes(headers);
	const isNamedEntries = kindsByName.includes('entries');
	if (isNamedEntries && holdsEntries) {
		return 'entries';
	}
	const listKind = kindsByName.find((kind) => kind !== 'entries');
	if (listKind) {
		return listKind;
	}
	if (holdsEntries) {
		return 'entries';
	}
	const hasProjectColumn = columnIndexOf(headers, PROJECT_HEADERS) !== null;
	const hasClientColumn = columnIndexOf(headers, CLIENT_HEADERS) !== null;
	const hasNameColumn = columnIndexOf(headers, NAME_HEADERS) !== null;
	const looksLikeProjects = hasProjectColumn || (hasNameColumn && hasClientColumn);
	if (looksLikeProjects) {
		return 'projects';
	}
	return null;
}

/** A value of a JSON object as a cell: a nested record by its name, a list of names joined by commas. */
function cellOf(value: unknown): string {
	if (value === null || value === undefined) {
		return '';
	}
	if (Array.isArray(value)) {
		return value.map(cellOf).filter((cell) => cell !== '').join(', ');
	}
	if (typeof value === 'object') {
		const name = (value as Record<string, unknown>).name;
		if (typeof name === 'string') {
			return name;
		}
		return '';
	}
	return String(value);
}

/** Flattens one level of nesting: `{ timeInterval: { start } }` gives a `timeInterval start` column. */
function flatRowOf(item: Record<string, unknown>): Map<string, string> {
	const row = new Map<string, string>();
	for (const [key, value] of Object.entries(item)) {
		const isPlainObject = typeof value === 'object' && value !== null && !Array.isArray(value);
		const hasName = isPlainObject && typeof (value as Record<string, unknown>).name === 'string';
		if (isPlainObject && !hasName) {
			for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
				row.set(`${key} ${childKey}`, cellOf(childValue));
			}
			continue;
		}
		row.set(key, cellOf(value));
	}
	return row;
}

function isRecordList(value: unknown): value is Array<Record<string, unknown>> {
	const isList = Array.isArray(value) && value.length > 0;
	return isList && value.every((item) => typeof item === 'object' && item !== null && !Array.isArray(item));
}

/** A JSON list of records as a table; the first record's keys come first, then any new key in order. */
export function tableOfRecords(items: ReadonlyArray<Record<string, unknown>>): TimeImportTable {
	const rows = items.map(flatRowOf);
	const headers: string[] = [];
	for (const row of rows) {
		for (const key of row.keys()) {
			if (!headers.includes(key)) {
				headers.push(key);
			}
		}
	}
	const records: TimeImportRecord[] = rows.map((row, index) => ({
		row: index + 2,
		cells: headers.map((header) => row.get(header) ?? '')
	}));
	return { headers, records };
}

/** The lists a JSON file holds: the file itself when it is a list, else each list it names, under that name. */
function jsonListsOf(fileName: string, text: string): Array<{ name: string; items: Array<Record<string, unknown>> }> | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		return null;
	}
	if (isRecordList(parsed)) {
		return [{ name: fileName, items: parsed }];
	}
	const isObject = typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
	if (!isObject) {
		return null;
	}
	const lists = Object.entries(parsed as Record<string, unknown>)
		.filter(([, value]) => isRecordList(value))
		.map(([key, value]) => ({ name: `${fileName} / ${key}`, items: value as Array<Record<string, unknown>> }));
	if (lists.length === 0) {
		return null;
	}
	return lists;
}

function needsQuotes(cell: string): boolean {
	const hasSpecial = /[",\r\n]/u.test(cell);
	const hasOuterSpace = cell !== cell.trim();
	return hasSpecial || hasOuterSpace;
}

function csvCellOf(cell: string): string {
	if (!needsQuotes(cell)) {
		return cell;
	}
	return `"${cell.replaceAll('"', '""')}"`;
}

/** A table written back as CSV text, quoted the way the time import reads it. */
export function csvTextOf(table: TimeImportTable): string {
	const lines = [table.headers, ...table.records.map((record) => record.cells)].map((cells) =>
		cells.map(csvCellOf).join(',')
	);
	return `${lines.join('\n')}\n`;
}

function sameHeaders(first: ReadonlyArray<string>, second: ReadonlyArray<string>): boolean {
	const isSameLength = first.length === second.length;
	return isSameLength && first.every((header, index) => headerWordsOf(header) === headerWordsOf(second[index]));
}

/** Appends a second file of entries under the first, numbered as its rows would be in one file. */
function withEntriesAppended(first: WorkspaceTable, next: TimeImportTable): WorkspaceTable {
	const lastRow = first.table.records.at(-1)?.row ?? 1;
	const appended = next.records.map((record, index) => ({ row: lastRow + index + 1, cells: record.cells }));
	return { ...first, table: { headers: first.table.headers, records: [...first.table.records, ...appended] } };
}

function decode(bytes: ArrayBuffer | Uint8Array): string | null {
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/u, '');
	} catch {
		return null;
	}
}

type NamedText = { fileName: string; text: string };

/** Every CSV or JSON text of the dropped files, archives opened; what cannot be read becomes a problem. */
async function textsOf(files: ReadonlyArray<WorkspacePickedFile>, problems: WorkspaceFileProblem[]) {
	const texts: NamedText[] = [];
	for (const file of files) {
		const extension = extensionOf(file.name);
		const isSupported = ['csv', 'json', 'zip'].includes(extension);
		if (!isSupported) {
			problems.push({ code: 'notSupported', fileName: file.name });
			continue;
		}
		if (file.size > WORKSPACE_IMPORT_MAX_FILE_BYTES) {
			problems.push({ code: 'tooLarge', fileName: file.name });
			continue;
		}
		const buffer = await file.arrayBuffer();
		if (extension !== 'zip') {
			const text = decode(buffer);
			if (text === null) {
				problems.push({ code: 'notText', fileName: file.name });
				continue;
			}
			texts.push({ fileName: file.name, text });
			continue;
		}
		const reading = zipEntriesOf(buffer);
		if (!reading.entries) {
			problems.push({ code: 'zip', fileName: file.name, problem: reading.problem });
			continue;
		}
		for (const entry of reading.entries) {
			const entryName = `${file.name} / ${entry.name}`;
			const entryExtension = extensionOf(entry.name);
			if (entryExtension !== 'csv' && entryExtension !== 'json') {
				problems.push({ code: 'notSupported', fileName: entryName });
				continue;
			}
			const text = decode(entry.bytes);
			if (text === null) {
				problems.push({ code: 'notText', fileName: entryName });
				continue;
			}
			texts.push({ fileName: entryName, text });
		}
	}
	return texts;
}

function tablesOf(named: NamedText, problems: WorkspaceFileProblem[]): Array<{ fileName: string; table: TimeImportTable }> {
	if (extensionOf(named.fileName) === 'json') {
		const lists = jsonListsOf(named.fileName, named.text);
		if (!lists) {
			problems.push({ code: 'json', fileName: named.fileName });
			return [];
		}
		return lists.map((list) => ({ fileName: list.name, table: tableOfRecords(list.items) }));
	}
	const reading = timeImportTableOf(named.text);
	if (!reading.table) {
		problems.push({ code: 'csv', fileName: named.fileName, problem: reading.problem });
		return [];
	}
	return [{ fileName: named.fileName, table: reading.table }];
}

/**
 * Reads the files of another tool's workspace export: CSV or JSON files, or ZIP archives of them. Each table is told
 * apart by its name (clients, projects, tags, time entries) or by its columns, files of entries with the same columns
 * are read as one, and every file that cannot be used is listed with the reason.
 */
export async function readWorkspaceFiles(files: ReadonlyArray<WorkspacePickedFile>): Promise<WorkspaceFiles> {
	const problems: WorkspaceFileProblem[] = [];
	const result: WorkspaceFiles = { clients: null, projects: null, tags: null, entries: null, read: [], problems };
	const texts = await textsOf(files, problems);
	for (const named of texts) {
		for (const { fileName, table } of tablesOf(named, problems)) {
			const kind = workspaceFileKindOf(fileName, table.headers);
			if (!kind) {
				problems.push({ code: 'unknownContent', fileName });
				continue;
			}
			const workspaceTable: WorkspaceTable = { fileName, kind, table };
			const current = result[kind];
			if (current === null) {
				result[kind] = workspaceTable;
				result.read.push(workspaceTable);
				continue;
			}
			const canAppend = kind === 'entries' && sameHeaders(current.table.headers, table.headers);
			if (canAppend) {
				result.entries = withEntriesAppended(current, table);
				result.read.push(workspaceTable);
				continue;
			}
			if (kind === 'entries') {
				problems.push({ code: 'entriesColumnsDiffer', fileName });
				continue;
			}
			problems.push({ code: 'repeatedKind', fileName, kind });
		}
	}
	return result;
}
