import { DATE_ORDERS, type DateOrder } from '@/core/lib/utils/time-import-cells';
import {
	NO_TIME_IMPORT_COLUMNS,
	TIME_IMPORT_FIELDS,
	type TimeImportColumnsChoice,
	type TimeImportField
} from '@/core/lib/utils/time-import-sheet';

export const TIME_IMPORT_COLUMNS_STORAGE_KEY = 'time-import-columns';

/** The most recent sets of headers whose columns this browser keeps. */
const KEPT_CHOICES = 10;

interface StoredColumnsChoice {
	/** Lower case and trimmed, so a file of the same headers finds its choice whatever their letter case. */
	headers: string[];
	mapping: Record<TimeImportField, number | null>;
	dateOrder: DateOrder | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	const isNonNull = value !== null;
	return isNonNull && typeof value === 'object';
}

function headersKeyOf(headers: ReadonlyArray<string>): string[] {
	return headers.map((header) => header.trim().toLowerCase());
}

function isSameHeaders(first: ReadonlyArray<string>, second: ReadonlyArray<string>): boolean {
	if (first.length !== second.length) {
		return false;
	}
	return first.every((header, index) => header === second[index]);
}

function headersFrom(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.filter((header): header is string => typeof header === 'string');
}

/** A kept column that the file does not have, or that is no column at all, reads as no column. */
function columnIndexFrom(value: unknown, headerCount: number): number | null {
	if (typeof value !== 'number') {
		return null;
	}
	const isWhole = Number.isInteger(value);
	const isInFile = value >= 0 && value < headerCount;
	if (!isWhole || !isInFile) {
		return null;
	}
	return value;
}

function mappingFrom(value: unknown, headerCount: number): Record<TimeImportField, number | null> {
	const mapping: Record<TimeImportField, number | null> = { ...NO_TIME_IMPORT_COLUMNS };
	if (!isRecord(value)) {
		return mapping;
	}
	for (const field of TIME_IMPORT_FIELDS) {
		mapping[field] = columnIndexFrom(value[field], headerCount);
	}
	return mapping;
}

function dateOrderFrom(value: unknown): DateOrder | null {
	const order = DATE_ORDERS.find((candidate) => candidate === value);
	return order ?? null;
}

/** The kept choices that still have the shape this module writes; anything else, edited or older, is dropped. */
function storedChoicesOf(stored: unknown): StoredColumnsChoice[] {
	if (!Array.isArray(stored)) {
		return [];
	}
	const choices: StoredColumnsChoice[] = [];
	for (const entry of stored) {
		if (!isRecord(entry)) {
			continue;
		}
		const headers = headersFrom(entry.headers);
		if (headers.length === 0) {
			continue;
		}
		const mapping = mappingFrom(entry.mapping, headers.length);
		choices.push({ headers, mapping, dateOrder: dateOrderFrom(entry.dateOrder) });
	}
	return choices;
}

/** The choice this browser keeps for a file of these headers, or null when it keeps none. */
export function storedColumnsChoiceOf(stored: unknown, headers: ReadonlyArray<string>): TimeImportColumnsChoice | null {
	const key = headersKeyOf(headers);
	const choice = storedChoicesOf(stored).find((candidate) => isSameHeaders(candidate.headers, key));
	if (!choice) {
		return null;
	}
	return { mapping: choice.mapping, dateOrder: choice.dateOrder };
}

/** What the browser keeps once a choice is made for these headers: that choice first, then the others. */
export function withColumnsChoiceKept(
	stored: unknown,
	headers: ReadonlyArray<string>,
	choice: TimeImportColumnsChoice
): StoredColumnsChoice[] {
	const key = headersKeyOf(headers);
	const mapping: Record<TimeImportField, number | null> = { ...choice.mapping };
	const kept: StoredColumnsChoice = { headers: key, mapping, dateOrder: choice.dateOrder };
	const others = storedChoicesOf(stored).filter((candidate) => !isSameHeaders(candidate.headers, key));
	const choices = [kept, ...others];
	return choices.slice(0, KEPT_CHOICES);
}
