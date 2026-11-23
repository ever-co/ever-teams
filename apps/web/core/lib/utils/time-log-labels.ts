import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

/**
 * The labels a time entry carries itself (Gauzy #12029): the kind of work, whatever the task. They are not the labels
 * of the entry's task, which the "Task labels" filter reads (see report-filters.ts).
 */

/** The permissions the API asks for to add a label; any one is enough (the workspace import asks the same). */
export const LABEL_CREATE_PERMISSIONS = ['ALL_ORG_EDIT', 'ORG_TAGS_ADD'] as const;

/** The entry labels a link picks, kept only where the API stores labels on entries: elsewhere they match nothing. */
export function supportedEntryLabelsOf(picked: ReadonlyArray<string>, isSupported: boolean): string[] {
	if (!isSupported) {
		return [];
	}
	return [...picked];
}

/** The value of the "No label" choice of the entry Labels filter, and the key of its group. */
export const NO_LABEL_VALUE = 'no-label';

/** The entry Labels filter as Gauzy takes it (the daily report, a saved report): label ids, and "No label" apart. */
interface EntryLabelFilters {
	tagIds?: string[];
	untagged?: boolean;
}

/** The entry Labels filter as Gauzy takes it: nothing for a filter that picks nothing. */
export function entryLabelFiltersOf(picked: ReadonlyArray<string>): EntryLabelFilters {
	if (picked.length === 0) {
		return {};
	}
	const tagIds = picked.filter((value) => value !== NO_LABEL_VALUE);
	const untagged = picked.includes(NO_LABEL_VALUE);
	return { tagIds, untagged };
}

/** The entry Labels filter of what Gauzy keeps (`entryLabelFiltersOf` read back): each label once, "No label" last. */
export function entryLabelsOfFilters(filters: EntryLabelFilters | null | undefined): string[] {
	const picked = new Set((filters?.tagIds ?? []).filter((id) => Boolean(id) && id !== NO_LABEL_VALUE));
	if (filters?.untagged === true) {
		picked.add(NO_LABEL_VALUE);
	}
	return [...picked];
}

/** A label as an entry carries it: what its chip shows. */
export interface EntryLabel {
	id: string;
	name: string;
	color: string | null;
}

/** The time of one label group: the label, or null for the time without one, and its entries. */
interface EntryLabelGroup<L extends Pick<ITimeLog, 'tags'>> {
	key: string;
	label: EntryLabel | null;
	logs: L[];
}

type LabelledEntry = Pick<ITimeLog, 'tags'>;

function byName(first: EntryLabel, second: EntryLabel) {
	return first.name.localeCompare(second.name, undefined, { sensitivity: 'base' });
}

function byNameOfGroup<L extends LabelledEntry>(first: EntryLabelGroup<L>, second: EntryLabelGroup<L>) {
	const firstName = first.label?.name ?? '';
	const secondName = second.label?.name ?? '';
	return firstName.localeCompare(secondName, undefined, { sensitivity: 'base' });
}

/** The labels an entry carries, each once, by name. An entry the API answered without labels carries none. */
export function entryLabelsOf(log: LabelledEntry | null | undefined): EntryLabel[] {
	const tags = log?.tags ?? [];
	const byId = new Map<string, EntryLabel>();
	for (const tag of tags) {
		const id = tag?.id;
		if (!id || byId.has(id)) {
			continue;
		}
		byId.set(id, { id, name: tag.name ?? '', color: tag.color ?? null });
	}
	return [...byId.values()].sort(byName);
}

/** The labels the entries carry between them, each once, by name. */
export function entryLabelsOfLogs(logs: ReadonlyArray<LabelledEntry>): EntryLabel[] {
	const byId = new Map<string, EntryLabel>();
	for (const log of logs) {
		for (const label of entryLabelsOf(log)) {
			if (!byId.has(label.id)) {
				byId.set(label.id, label);
			}
		}
	}
	return [...byId.values()].sort(byName);
}

/** An entry the picked labels keep: one of them, or none with "No label". Nothing picked keeps every entry. */
export function logMatchesEntryLabels(log: LabelledEntry, picked: ReadonlyArray<string>): boolean {
	if (picked.length === 0) {
		return true;
	}
	const labels = entryLabelsOf(log);
	const hasNoLabel = labels.length === 0;
	if (hasNoLabel) {
		return picked.includes(NO_LABEL_VALUE);
	}
	return labels.some((label) => picked.includes(label.id));
}

/**
 * The entries by label: an entry with two labels counts in each of their groups, so the groups overlap and their sum
 * can pass the total; the entries without a label form the last group. Groups are by label name.
 */
export function groupLogsByEntryLabel<L extends LabelledEntry>(logs: ReadonlyArray<L>): EntryLabelGroup<L>[] {
	const groups = new Map<string, EntryLabelGroup<L>>();
	const unlabelled: L[] = [];
	for (const log of logs) {
		const labels = entryLabelsOf(log);
		if (labels.length === 0) {
			unlabelled.push(log);
			continue;
		}
		for (const label of labels) {
			const group = groups.get(label.id) ?? { key: label.id, label, logs: [] };
			group.logs.push(log);
			groups.set(label.id, group);
		}
	}
	const labelled = [...groups.values()].sort(byNameOfGroup);
	if (unlabelled.length === 0) {
		return labelled;
	}
	return [...labelled, { key: NO_LABEL_VALUE, label: null, logs: unlabelled }];
}

/** Whether entries counted by label overlap: one entry carries two labels or more. */
export function entryLabelGroupsOverlap(logs: ReadonlyArray<LabelledEntry>): boolean {
	return logs.some((log) => entryLabelsOf(log).length > 1);
}

/**
 * Labels as one cell of an export: each once, by name, separated by commas. The same labels give the same text in any
 * order, so the export can match an entry's row by it (`time-activity-export-billable.ts`).
 */
export function labelNamesOf(labels: ReadonlyArray<EntryLabel>): string {
	const byId = new Map<string, EntryLabel>();
	for (const label of labels) {
		if (!byId.has(label.id)) {
			byId.set(label.id, label);
		}
	}
	return [...byId.values()]
		.sort(byName)
		.map((label) => label.name)
		.join(', ');
}

/** The labels of an entry as one cell of an export: their names, by name, separated by commas. */
export function entryLabelNamesOf(log: LabelledEntry | null | undefined): string {
	return labelNamesOf(entryLabelsOf(log));
}
