import {
	DEFAULT_TEAM_TASKS_VIEW,
	type TeamTasksFilterField,
	type TeamTasksFilters,
	type TeamTasksScope,
	type TeamTasksViewSettings
} from './team-tasks-view';
import { scopeFromStorage, viewSettingsFromStorage } from './team-tasks-view-storage';
import { ETaskBuiltInView, type ITaskView, type ITaskViewDefinition } from '@/core/types/interfaces/common/task-views';

const FILTER_FIELDS: TeamTasksFilterField[] = ['status', 'priority', 'size', 'issueType', 'label', 'project', 'assignee', 'epic'];

/** The definition every view starts from: the page's default settings, no filters, the active scope. */
export const DEFAULT_TASK_VIEW_DEFINITION: ITaskViewDefinition = {
	settings: DEFAULT_TEAM_TASKS_VIEW,
	filters: {},
	scope: 'active',
	search: ''
};

/** The filters of a stored value: only the known fields, each a list of strings. */
export function filtersFromStored(value: unknown): TeamTasksFilters {
	const filters: TeamTasksFilters = {};
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return filters;
	}
	const record = value as Record<string, unknown>;
	for (const field of FILTER_FIELDS) {
		const values = record[field];
		if (Array.isArray(values)) {
			const strings = values.filter((item): item is string => typeof item === 'string');
			if (strings.length) filters[field] = strings;
		}
	}
	return filters;
}

/** The definition a saved view holds: its three JSON columns read back with every default in place. */
export function definitionOf(view: Pick<ITaskView, 'filterOptions' | 'displayOptions' | 'queryParams'>): ITaskViewDefinition {
	const query = (view.queryParams ?? {}) as Record<string, unknown>;
	return {
		settings: viewSettingsFromStorage(view.displayOptions ?? DEFAULT_TEAM_TASKS_VIEW),
		filters: filtersFromStored(view.filterOptions),
		scope: scopeFromStorage(query['scope']),
		search: typeof query['search'] === 'string' ? query['search'] : ''
	};
}

/** The three JSON columns a definition is saved as. */
export function columnsOf(definition: ITaskViewDefinition): Pick<ITaskView, 'filterOptions' | 'displayOptions' | 'queryParams'> {
	return {
		displayOptions: { ...definition.settings } as Record<string, unknown>,
		filterOptions: { ...definition.filters } as Record<string, unknown>,
		queryParams: { scope: definition.scope, search: definition.search ?? '' }
	};
}

function normalizedFilters(filters: TeamTasksFilters): Record<string, string[]> {
	const result: Record<string, string[]> = {};
	for (const field of FILTER_FIELDS) {
		const values = filters[field];
		if (values?.length) result[field] = [...values].sort((first, second) => first.localeCompare(second));
	}
	return result;
}

/** Whether two definitions show the same list (filters compared as sets, the search trimmed). */
export function isSameDefinition(first: ITaskViewDefinition, second: ITaskViewDefinition): boolean {
	const settingsEqual = JSON.stringify(first.settings) === JSON.stringify(second.settings);
	const filtersEqual = JSON.stringify(normalizedFilters(first.filters)) === JSON.stringify(normalizedFilters(second.filters));
	const scopeEqual = first.scope === second.scope;
	const searchEqual = (first.search ?? '').trim() === (second.search ?? '').trim();
	return settingsEqual && filtersEqual && scopeEqual && searchEqual;
}

/** Whether a route segment names a built-in view. */
export function isBuiltInViewKey(key: string | null | undefined): key is ETaskBuiltInView {
	return !!key && (Object.values(ETaskBuiltInView) as string[]).includes(key);
}

/** The views in sidebar order: shared ones first, then personal, by name. */
export function sortTaskViews(views: readonly ITaskView[]): ITaskView[] {
	return [...views].sort((first, second) => {
		const firstPersonal = first.visibility === 'personal' ? 1 : 0;
		const secondPersonal = second.visibility === 'personal' ? 1 : 0;
		return firstPersonal - secondPersonal || (first.name ?? '').localeCompare(second.name ?? '');
	});
}

/** The name a view is saved under: trimmed, never empty, at most 80 characters. */
export function normalizedViewName(name: string, fallback: string): string {
	const trimmed = name.trim().slice(0, 80);
	return trimmed || fallback;
}

/** The scope a view's definition is read with (its `queryParams.scope`, falling back to active). */
export function scopeOf(definition: ITaskViewDefinition): TeamTasksScope {
	return definition.scope;
}

/** The settings a view's definition is read with. */
export function settingsOf(definition: ITaskViewDefinition): TeamTasksViewSettings {
	return definition.settings;
}
