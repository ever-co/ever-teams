/**
 * The labels a team can add from Settings › Labels › Browse labels (#5016), by category, with the names and colours
 * the issue proposes (after GitHub, GitLab, Jira and Linear). They are added as the team's own labels, which the
 * team can then rename, recolour or remove like any other. Names stay in English: a label is the team's data, shared
 * by people who read the app in different languages.
 *
 * The names and colours live in task-label-catalog.json, one key per category in the issue's order. Written as code,
 * the seventy entries of one shape counted as duplicated lines.
 */
import catalogData from './task-label-catalog.json';

export type LabelCategoryKey = 'type' | 'priority' | 'workflow' | 'area' | 'release' | 'feedback' | 'project';

export interface CatalogLabel {
	name: string;
	color: string;
}

export interface LabelCategory {
	key: LabelCategoryKey;
	labels: ReadonlyArray<CatalogLabel>;
}

/** Each category's labels, name to colour. A category missing from the file is a type error here. */
const CATALOG_DATA: Readonly<Record<LabelCategoryKey, Readonly<Record<string, string>>>> = catalogData;

export const LABEL_CATALOG: ReadonlyArray<LabelCategory> = (Object.keys(CATALOG_DATA) as LabelCategoryKey[]).map(
	(key) => ({
		key,
		labels: Object.entries(CATALOG_DATA[key]).map(([name, color]) => ({ name, color }))
	})
);

/**
 * What two label names are compared by: trimmed, in lower case, with dashes and runs of spaces as one space. The
 * app shows a stored dash as a space, so "Follow-up" and "follow up" are the same label to anyone reading it.
 */
export function labelNameKeyOf(name: string | null | undefined): string {
	// Trimmed last: a leading or trailing dash becomes a space, which must not tell two names apart
	return (name ?? '').toLowerCase().replaceAll('-', ' ').replaceAll(/\s+/g, ' ').trim();
}

/** The keys of a team's label names, to tell which catalog labels it already has. */
export function labelNameKeysOf(names: ReadonlyArray<string | null | undefined>): Set<string> {
	return new Set(names.map(labelNameKeyOf).filter(Boolean));
}

export interface CatalogEntry {
	label: CatalogLabel;
	/** The team already has a label of that name: it shows as added and cannot be picked again. */
	isAdded: boolean;
}

export interface CatalogGroup {
	key: LabelCategoryKey;
	entries: CatalogEntry[];
}

/**
 * The catalog as the dialog lists it: the categories whose labels match the search (on the name, or on the
 * category's own name, so "priority" lists the whole category), each label marked when the team has it already.
 */
export function catalogGroupsOf(
	query: string,
	existingKeys: ReadonlySet<string>,
	categoryNameOf: (key: LabelCategoryKey) => string
): CatalogGroup[] {
	const search = labelNameKeyOf(query);
	const groups: CatalogGroup[] = [];
	for (const category of LABEL_CATALOG) {
		const isCategoryMatch = search !== '' && labelNameKeyOf(categoryNameOf(category.key)).includes(search);
		const entries = category.labels
			.filter((item) => isCategoryMatch || labelNameKeyOf(item.name).includes(search))
			.map((item) => ({ label: item, isAdded: existingKeys.has(labelNameKeyOf(item.name)) }));
		if (entries.length > 0) {
			groups.push({ key: category.key, entries });
		}
	}
	return groups;
}
