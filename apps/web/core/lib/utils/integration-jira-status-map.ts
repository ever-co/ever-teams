import { matchStatusName, type LinearStatusOption } from '@/core/lib/utils/integration-linear-state-map';
import {
	IJiraStatusDefinition,
	JIRA_STATUS_CATEGORIES,
	TJiraStatusCategory
} from '@/core/types/interfaces/integrations/jira';

/** The task status each status category becomes unless the mapping says otherwise (the platform's own defaults). */
export const FALLBACK_CATEGORY_MAP: Record<TJiraStatusCategory, string> = {
	new: 'open',
	indeterminate: 'in-progress',
	done: 'completed'
};

/** The value of a status field that leaves the status to its category (selects cannot hold an empty value). */
export const STATUS_BY_CATEGORY = '__by_category__';

export type JiraCategoryMap = Record<TJiraStatusCategory, string>;

const STATUS_KEY = /^status:(\d{1,20})$/;

/** The key a status map gives one Jira status (`status:<id>`), which wins over its category's entry. */
export function statusKeyOf(statusId: string): string {
	return `status:${statusId}`;
}

/** The category entries a mapping works with: the platform's defaults under the mapping's own entries, blanks skipped. */
export function effectiveCategoryMap(
	defaults: Record<string, string> | null | undefined,
	stored: Record<string, string> | null | undefined
): JiraCategoryMap {
	const map = { ...FALLBACK_CATEGORY_MAP };
	for (const category of JIRA_STATUS_CATEGORIES) {
		const value = stored?.[category] ?? defaults?.[category];
		if (typeof value === 'string' && value.trim()) map[category] = value;
	}
	return map;
}

/** How many Jira statuses the map names on their own (`status:<id>` entries). */
export function statusOverrideCount(statusMap: Record<string, string> | null | undefined): number {
	return Object.entries(statusMap ?? {}).filter(
		([key, value]) => STATUS_KEY.test(key) && typeof value === 'string' && value.trim()
	).length;
}

/** The form's fields for a project's statuses and a stored map: the stored status, or "by its category" when the map leaves it out. */
export function statusFieldsOf(
	statuses: readonly IJiraStatusDefinition[],
	statusMap: Record<string, string> | null | undefined
): Record<string, string> {
	const fields: Record<string, string> = {};
	for (const status of statuses) {
		const value = statusMap?.[statusKeyOf(status.id)];
		fields[status.id] = typeof value === 'string' && value.trim() ? value : STATUS_BY_CATEGORY;
	}
	return fields;
}

/**
 * The map the platform stores from the form: the three category entries, and a `status:<id>` entry for each status
 * given a status of its own (statuses the project no longer has are left out).
 */
export function statusMapOf(categories: JiraCategoryMap, fields: Record<string, string>): Record<string, string> {
	const map: Record<string, string> = {};
	for (const category of JIRA_STATUS_CATEGORIES) {
		const value = categories[category]?.trim();
		if (value) map[category] = value;
	}
	for (const [statusId, value] of Object.entries(fields)) {
		const status = value === STATUS_BY_CATEGORY ? '' : value.trim();
		if (/^\d{1,20}$/.test(statusId) && status) map[statusKeyOf(statusId)] = status;
	}
	return map;
}

/** The categories whose value names no status: saved, such a value would leave every imported issue of it without a status row. */
export function invalidCategories(
	categories: JiraCategoryMap,
	options: readonly LinearStatusOption[]
): TJiraStatusCategory[] {
	return JIRA_STATUS_CATEGORIES.filter((category) => !matchStatusName(categories[category], options));
}

/** The Jira statuses whose chosen status names no status of the project or the organization (one left to its category is always fine). */
export function invalidStatusFields(fields: Record<string, string>, options: readonly LinearStatusOption[]): string[] {
	return Object.entries(fields)
		.filter(([, value]) => value !== STATUS_BY_CATEGORY && !matchStatusName(value, options))
		.map(([statusId]) => statusId);
}

/** A Jira status's category, when it is one of the three. */
export function categoryOfStatus(status: IJiraStatusDefinition): TJiraStatusCategory | null {
	const key = status.statusCategory?.key;
	return (JIRA_STATUS_CATEGORIES as readonly string[]).includes(String(key)) ? (key as TJiraStatusCategory) : null;
}
